import assert from "node:assert/strict";
import { copyFile, writeFile } from "node:fs/promises";
import { after, before, test } from "node:test";

import { buildApp, type VibeLoadApi } from "../src/app.js";

let app: VibeLoadApi;

before(async () => {
  app = await buildApp({ logger: false });
});

after(async () => {
  await app.close();
});

test("reports service health", async () => {
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok", revision: "local" });
});

test("requires explicit rights confirmation", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/analyze",
    payload: { url: "https://media.example.com/video.mp4" },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "RIGHTS_CONFIRMATION_REQUIRED");
});

test("blocks private URLs during analysis", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/analyze",
    payload: { url: "http://127.0.0.1/video.mp4", consent: true },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "PRIVATE_ADDRESS_BLOCKED");
});

test("rejects unknown conversion qualities without starting work", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/jobs",
    payload: {
      url: "https://media.example.com/video.mp4",
      mediaType: "video",
      quality: "9999p",
      consent: true,
    },
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "INVALID_QUALITY");
});

test("does not expose a local upload route", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/uploads",
  });

  assert.equal(response.statusCode, 404);
});

test("downloads, processes and serves an authorized URL", async () => {
  const downloadApp = await buildApp({
    logger: false,
    convert: async (sourcePath, destinationPath) => copyFile(sourcePath, destinationPath),
    download: async (url, destinationPath, mediaType, quality) => {
      assert.equal(url, "https://media.example.com/authorized.mp3");
      assert.equal(mediaType, "audio");
      assert.equal(quality, "128 kbps");
      await writeFile(destinationPath, "authorized-test-media");
      return {
        path: destinationPath,
        contentType: "audio/mpeg",
        contentLength: 21,
        receivedBytes: 21,
        finalUrl: new URL(url),
      };
    },
  });
  const mediaBytes = "authorized-test-media";

  try {
    const created = await downloadApp.inject({
      method: "POST",
      url: "/api/jobs",
      payload: {
        url: "https://media.example.com/authorized.mp3",
        mediaType: "audio",
        quality: "128 kbps",
        consent: true,
      },
    });
    assert.equal(created.statusCode, 202);
    const jobId = created.json().job.id as string;

    let job: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await downloadApp.inject({ method: "GET", url: `/api/jobs/${jobId}` });
      job = response.json().job as Record<string, unknown>;
      if (job.status === "ready") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.equal(job?.status, "ready");
    const downloaded = await downloadApp.inject({ method: "GET", url: `/api/jobs/${jobId}/download` });
    assert.equal(downloaded.statusCode, 200);
    assert.equal(downloaded.headers["content-type"], "audio/mp4");
    assert.equal(downloaded.rawPayload.toString("utf8"), mediaBytes);
  } finally {
    await downloadApp.close();
  }
});
