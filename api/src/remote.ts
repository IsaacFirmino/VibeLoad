import { open } from "node:fs/promises";

import { config } from "./config.js";
import { ApiError } from "./errors.js";
import { assertPublicRemoteUrl } from "./security.js";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const allowedContentTypes = ["audio/", "video/", "application/octet-stream"];

type ValidatedResponse = {
  response: Response;
  finalUrl: URL;
};

function validateHeaders(response: Response) {
  const contentType = (response.headers.get("content-type") ?? "application/octet-stream")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase() ?? "application/octet-stream";
  const contentLength = Number.parseInt(response.headers.get("content-length") ?? "0", 10);

  if (!allowedContentTypes.some((prefix) => contentType.startsWith(prefix))) {
    throw new ApiError("O endereço precisa apontar diretamente para um arquivo de áudio ou vídeo.", 415, "UNSUPPORTED_SOURCE_TYPE");
  }

  if (Number.isFinite(contentLength) && contentLength > config.maxSourceBytes) {
    throw new ApiError("O arquivo excede o limite permitido.", 413, "SOURCE_TOO_LARGE");
  }

  return { contentType, contentLength: contentLength || null };
}

async function fetchValidated(
  input: string | URL,
  init: RequestInit,
  maximumRedirects = 3,
): Promise<ValidatedResponse> {
  let currentUrl = await assertPublicRemoteUrl(input);

  for (let redirectCount = 0; redirectCount <= maximumRedirects; redirectCount += 1) {
    let response: Response;

    try {
      response = await fetch(currentUrl, { ...init, redirect: "manual" });
    } catch {
      throw new ApiError("Não foi possível acessar a origem da mídia.", 502, "SOURCE_UNAVAILABLE");
    }

    if (!redirectStatuses.has(response.status)) {
      return { response, finalUrl: currentUrl };
    }

    const location = response.headers.get("location");
    await response.body?.cancel();

    if (!location || redirectCount === maximumRedirects) {
      throw new ApiError("A origem da mídia redirecionou vezes demais.", 400, "TOO_MANY_REDIRECTS");
    }

    currentUrl = await assertPublicRemoteUrl(new URL(location, currentUrl));
  }

  throw new ApiError("Não foi possível acessar a origem da mídia.", 502, "SOURCE_UNAVAILABLE");
}

export async function inspectRemoteMedia(value: string) {
  const signal = AbortSignal.timeout(Math.min(config.downloadTimeoutMs, 30_000));
  let result = await fetchValidated(value, { method: "HEAD", signal });

  if (result.response.status === 405 || result.response.status === 501) {
    await result.response.body?.cancel();
    result = await fetchValidated(value, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
      signal,
    });
  }

  if (!result.response.ok) {
    await result.response.body?.cancel();
    throw new ApiError("A origem recusou o acesso ao arquivo.", 422, "SOURCE_REJECTED");
  }

  const metadata = validateHeaders(result.response);
  await result.response.body?.cancel();

  return {
    source: result.finalUrl.hostname.replace(/^www\./, ""),
    ...metadata,
  };
}

export async function downloadRemoteMedia(value: string, destination: string) {
  const result = await fetchValidated(value, {
    method: "GET",
    signal: AbortSignal.timeout(config.downloadTimeoutMs),
  });

  if (!result.response.ok || !result.response.body) {
    await result.response.body?.cancel();
    throw new ApiError("Não foi possível baixar o arquivo de origem.", 422, "SOURCE_DOWNLOAD_FAILED");
  }

  const metadata = validateHeaders(result.response);
  const reader = result.response.body.getReader();
  const file = await open(destination, "wx");
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > config.maxSourceBytes) {
        throw new ApiError("O arquivo excede o limite permitido.", 413, "SOURCE_TOO_LARGE");
      }

      let offset = 0;
      while (offset < value.byteLength) {
        const { bytesWritten } = await file.write(value, offset);
        if (bytesWritten === 0) {
          throw new ApiError("Não foi possível salvar o arquivo temporário.", 500, "TEMPORARY_WRITE_FAILED");
        }
        offset += bytesWritten;
      }
    }
  } finally {
    await file.close();
    await reader.cancel().catch(() => undefined);
  }

  return {
    ...metadata,
    receivedBytes,
    finalUrl: result.finalUrl,
  };
}
