import assert from "node:assert/strict";
import { copyFile } from "node:fs/promises";
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

test("requires rights confirmation for local uploads", async () => {
  const response = await app.inject({
    method: "POST",
    url: "/api/uploads?mediaType=audio&quality=128%20kbps",
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json().error.code, "RIGHTS_CONFIRMATION_REQUIRED");
});

test("rejects unsupported local upload types", async () => {
  const boundary = "vibeload-test-boundary";
  const payload = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="notes.txt"',
    "Content-Type: text/plain",
    "",
    "not media",
    `--${boundary}--`,
    "",
  ].join("\r\n"));
  const response = await app.inject({
    method: "POST",
    url: "/api/uploads?mediaType=audio&quality=128%20kbps&consent=true",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
      "content-length": String(payload.length),
    },
    payload,
  });

  assert.equal(response.statusCode, 415);
  assert.equal(response.json().error.code, "UNSUPPORTED_UPLOAD_TYPE");
});

test("uploads, processes and downloads an authorized local file", async () => {
  const uploadApp = await buildApp({
    logger: false,
    convert: async (sourcePath, destinationPath) => copyFile(sourcePath, destinationPath),
  });
  const boundary = "vibeload-valid-upload-boundary";
  const mediaBytes = "authorized-test-media";
  const payload = Buffer.from([
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="sample.mp3"',
    "Content-Type: audio/mpeg",
    "",
    mediaBytes,
    `--${boundary}--`,
    "",
  ].join("\r\n"));

  try {
    const created = await uploadApp.inject({
      method: "POST",
      url: "/api/uploads?mediaType=audio&quality=128%20kbps&consent=true",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
        "content-length": String(payload.length),
      },
      payload,
    });
    assert.equal(created.statusCode, 202);
    const jobId = created.json().job.id as string;

    let job: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await uploadApp.inject({ method: "GET", url: `/api/jobs/${jobId}` });
      job = response.json().job as Record<string, unknown>;
      if (job.status === "ready") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    assert.equal(job?.status, "ready");
    const downloaded = await uploadApp.inject({ method: "GET", url: `/api/jobs/${jobId}/download` });
    assert.equal(downloaded.statusCode, 200);
    assert.equal(downloaded.headers["content-type"], "audio/mp4");
    assert.equal(downloaded.rawPayload.toString("utf8"), mediaBytes);
  } finally {
    await uploadApp.close();
  }
});
