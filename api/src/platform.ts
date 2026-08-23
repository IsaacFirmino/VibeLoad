import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { config } from "./config.js";
import { ApiError } from "./errors.js";
import type { MediaType } from "./profiles.js";
import { assertPublicRemoteUrl, parseRemoteUrl } from "./security.js";

type SupportedPlatform = {
  name: string;
  domains: string[];
};

const supportedPlatforms: SupportedPlatform[] = [
  { name: "YouTube", domains: ["youtube.com", "youtu.be"] },
  { name: "Instagram", domains: ["instagram.com"] },
  { name: "TikTok", domains: ["tiktok.com"] },
  { name: "Facebook", domains: ["facebook.com", "fb.watch"] },
];

const ytDlpRuntimeArgs = [
  "--js-runtimes",
  "node",
  "--remote-components",
  "ejs:github",
];

const videoQualityHeights: Record<string, number> = {
  "4K": 2160,
  "1080p": 1080,
  "720p": 720,
  "480p": 480,
};

export function getPlatformFormatSelector(mediaType: MediaType, quality: string) {
  if (mediaType === "audio") return "ba/b";

  const maximumHeight = videoQualityHeights[quality] ?? 1080;
  return `bv*[height<=${maximumHeight}]+ba/b[height<=${maximumHeight}]/b`;
}

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function getSupportedPlatform(value: string | URL) {
  const url = value instanceof URL ? value : parseRemoteUrl(value);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  return supportedPlatforms.find((platform) =>
    platform.domains.some((domain) => matchesDomain(hostname, domain)),
  ) ?? null;
}

async function runYtDlp(args: string[], timeoutMs: number) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("yt-dlp", args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      if (error) reject(error);
      else resolve(stdout.trim());
    };

    const timeout = globalThis.setTimeout(() => {
      child.kill("SIGKILL");
      finish(new ApiError("A plataforma demorou mais que o limite permitido.", 504, "PLATFORM_TIMEOUT"));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < 1_000_000) stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 16_000) stderr += chunk.toString("utf8");
    });

    child.on("error", () => {
      finish(new ApiError("O conector de plataformas não está disponível.", 500, "YTDLP_UNAVAILABLE"));
    });

    child.on("exit", (code) => {
      if (code === 0) {
        finish();
        return;
      }

      const isUnavailable = /unsupported url/i.test(stderr);
      const isAccessRestricted = /sign in to confirm|not a bot|cookies/i.test(stderr);
      finish(new ApiError(
        isUnavailable
          ? "Este endereço ainda não é compatível com o conector de plataformas."
          : isAccessRestricted
            ? "A plataforma recusou temporariamente o servidor. Tente novamente mais tarde."
          : "A plataforma não liberou esta mídia para processamento.",
        422,
        isUnavailable
          ? "UNSUPPORTED_PLATFORM_URL"
          : isAccessRestricted
            ? "PLATFORM_ACCESS_RESTRICTED"
            : "PLATFORM_REJECTED",
      ));
    });
  });
}

export async function inspectPlatformMedia(value: string) {
  const url = await assertPublicRemoteUrl(value);
  const platform = getSupportedPlatform(url);
  if (!platform) return null;

  const output = await runYtDlp([
    ...ytDlpRuntimeArgs,
    "--dump-single-json",
    "--skip-download",
    "--no-playlist",
    "--no-warnings",
    "--socket-timeout",
    "20",
    "--",
    url.toString(),
  ], Math.min(config.downloadTimeoutMs, 90_000));

  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(output) as Record<string, unknown>;
  } catch {
    throw new ApiError("A plataforma retornou metadados inválidos.", 502, "INVALID_PLATFORM_METADATA");
  }

  if (metadata.is_live === true || metadata.live_status === "is_live") {
    throw new ApiError("Transmissões ao vivo não podem ser processadas.", 422, "LIVE_MEDIA_UNSUPPORTED");
  }

  const duration = Number(metadata.duration ?? 0);
  if (Number.isFinite(duration) && duration > config.maxMediaDurationSeconds) {
    throw new ApiError("A mídia excede a duração máxima permitida.", 413, "MEDIA_TOO_LONG");
  }

  const estimatedSize = Number(metadata.filesize ?? metadata.filesize_approx ?? 0);
  if (Number.isFinite(estimatedSize) && estimatedSize > config.maxSourceBytes) {
    throw new ApiError("O arquivo excede o limite permitido.", 413, "SOURCE_TOO_LARGE");
  }

  return {
    source: platform.name,
    contentType: "video/platform",
    contentLength: estimatedSize || null,
    title: typeof metadata.title === "string" ? metadata.title.slice(0, 200) : null,
  };
}

export async function downloadPlatformMedia(
  value: string,
  destination: string,
  mediaType: MediaType,
  quality: string,
) {
  const url = await assertPublicRemoteUrl(value);
  const platform = getSupportedPlatform(url);
  if (!platform) return null;

  const directory = dirname(destination);
  const outputPrefix = basename(destination);
  const outputTemplate = join(directory, `${outputPrefix}.%(ext)s`);

  await runYtDlp([
    ...ytDlpRuntimeArgs,
    "--no-playlist",
    "--no-warnings",
    "--no-progress",
    "--no-simulate",
    "--socket-timeout",
    "30",
    "--retries",
    "3",
    "--fragment-retries",
    "3",
    "--max-filesize",
    String(config.maxSourceBytes),
    "--format",
    getPlatformFormatSelector(mediaType, quality),
    "--merge-output-format",
    "mp4",
    "--output",
    outputTemplate,
    "--print",
    "after_move:filepath",
    "--",
    url.toString(),
  ], config.downloadTimeoutMs);

  const candidates = (await readdir(directory))
    .filter((name) => name.startsWith(`${outputPrefix}.`))
    .filter((name) => !name.endsWith(".part") && !name.endsWith(".ytdl") && !name.endsWith(".json"));

  for (const name of candidates) {
    const path = join(directory, name);
    const fileStats = await stat(path);
    if (!fileStats.isFile()) continue;
    if (fileStats.size > config.maxSourceBytes) {
      throw new ApiError("O arquivo excede o limite permitido.", 413, "SOURCE_TOO_LARGE");
    }

    return {
      path,
      contentType: "video/platform",
      receivedBytes: fileStats.size,
      finalUrl: url,
    };
  }

  throw new ApiError("A plataforma não entregou um arquivo utilizável.", 422, "PLATFORM_DOWNLOAD_FAILED");
}
