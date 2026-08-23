import assert from "node:assert/strict";
import { test } from "node:test";

import { readYtDlpProxyUrl } from "../src/config.js";

test("accepts authenticated HTTP and SOCKS proxy URLs", () => {
  assert.equal(
    readYtDlpProxyUrl(" https://user:password@proxy.example:8443 "),
    "https://user:password@proxy.example:8443",
  );
  assert.equal(
    readYtDlpProxyUrl("socks5://user:password@proxy.example:1080"),
    "socks5://user:password@proxy.example:1080",
  );
});

test("keeps the proxy optional", () => {
  assert.equal(readYtDlpProxyUrl(), null);
  assert.equal(readYtDlpProxyUrl("   "), null);
});

test("rejects malformed or unsupported proxy URLs", () => {
  assert.throws(() => readYtDlpProxyUrl("not-a-url"), /URL de proxy válida/);
  assert.throws(() => readYtDlpProxyUrl("file:///tmp/proxy"), /HTTP, HTTPS ou SOCKS/);
});
