import { spawn } from "node:child_process";

import { config } from "./config.js";
import { ApiError } from "./errors.js";
import type { ConversionProfile } from "./profiles.js";

export async function convertMedia(
  sourcePath: string,
  destinationPath: string,
  profile: ConversionProfile,
) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-i",
    sourcePath,
    ...profile.ffmpegArgs,
    destinationPath,
  ];

  await new Promise<void>((resolve, reject) => {
    const process = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    let errorOutput = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      if (error) reject(error);
      else resolve();
    };

    const timeout = globalThis.setTimeout(() => {
      process.kill("SIGKILL");
      finish(new ApiError("A conversão excedeu o tempo permitido.", 504, "CONVERSION_TIMEOUT"));
    }, config.conversionTimeoutMs);

    process.stderr.on("data", (chunk: Buffer) => {
      if (errorOutput.length < 16_000) errorOutput += chunk.toString("utf8");
    });

    process.on("error", (error) => {
      finish(new ApiError(`FFmpeg indisponível: ${error.message}`, 500, "FFMPEG_UNAVAILABLE"));
    });

    process.on("exit", (code, signal) => {
      if (code === 0) {
        finish();
        return;
      }

      const detail = errorOutput.trim().slice(-800);
      finish(new ApiError(
        detail ? `Não foi possível converter a mídia: ${detail}` : `Conversão encerrada com ${signal ?? `código ${code}`}.`,
        422,
        "CONVERSION_FAILED",
      ));
    });
  });
}
