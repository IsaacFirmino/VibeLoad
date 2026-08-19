import assert from "node:assert/strict";
import { test } from "node:test";

import { getProfile } from "../src/profiles.js";
import { assertPublicRemoteUrl, isBlockedAddress, parseRemoteUrl } from "../src/security.js";

test("blocks private, loopback, link-local and reserved addresses", () => {
  const blocked = [
    "127.0.0.1",
    "10.0.0.2",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ];

  blocked.forEach((address) => assert.equal(isBlockedAddress(address), true, address));
  assert.equal(isBlockedAddress("8.8.8.8"), false);
});

test("accepts only safe HTTP ports and no embedded credentials", () => {
  assert.equal(parseRemoteUrl("https://media.example.com/video.mp4").hostname, "media.example.com");
  assert.throws(() => parseRemoteUrl("ftp://media.example.com/video.mp4"), /HTTP ou HTTPS/);
  assert.throws(() => parseRemoteUrl("https://user:pass@media.example.com/video.mp4"), /credenciais/);
  assert.throws(() => parseRemoteUrl("https://media.example.com:8080/video.mp4"), /porta/);
});

test("rejects literal private targets before a network request", async () => {
  await assert.rejects(
    assertPublicRemoteUrl("http://127.0.0.1/video.mp4"),
    /rede privada ou reservada/,
  );
});

test("maps only predefined conversion profiles", () => {
  const profile = getProfile("audio", "320 kbps");
  assert.equal(profile.extension, "mp3");
  assert.deepEqual(profile.ffmpegArgs.slice(0, 2), ["-vn", "-c:a"]);
  assert.throws(() => getProfile("video", "9999p"), /não disponível/);
});
