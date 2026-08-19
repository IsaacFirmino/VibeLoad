import assert from "node:assert/strict";
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
