import assert from "node:assert/strict";
import { test } from "node:test";

import { getSupportedPlatform } from "../src/platform.js";

test("recognizes only the advertised platform hostnames", () => {
  assert.equal(getSupportedPlatform("https://www.youtube.com/watch?v=example")?.name, "YouTube");
  assert.equal(getSupportedPlatform("https://youtu.be/example")?.name, "YouTube");
  assert.equal(getSupportedPlatform("https://www.instagram.com/reel/example")?.name, "Instagram");
  assert.equal(getSupportedPlatform("https://www.tiktok.com/@creator/video/123")?.name, "TikTok");
  assert.equal(getSupportedPlatform("https://fb.watch/example")?.name, "Facebook");
});

test("does not treat lookalike or unrelated hosts as supported platforms", () => {
  assert.equal(getSupportedPlatform("https://youtube.com.example.org/video"), null);
  assert.equal(getSupportedPlatform("https://example.org/video.mp4"), null);
});
