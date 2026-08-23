import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the VibeLoad landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /VibeLoad \| Vídeos e músicas no seu ritmo/);
  assert.match(html, /Salve o que você quer\./);
  assert.match(html, /Ouça quando quiser\./);
  assert.match(html, /Seu download começa com um link\./);
  assert.match(html, /hero-editorial\.png/);
  assert.match(html, /audio-editorial\.png/);
  assert.match(html, /offline-editorial\.png/);
  assert.equal((html.match(/<section\b/g) ?? []).length, 9);
  assert.doesNotMatch(html, /[\u2013\u2014]/u);
});

test("keeps the design and interaction contracts explicit", async () => {
  const [page, cssEntry, sharedCss, converter, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    readFile(new URL("../app/components/ConverterWorkbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  const source = `${page}\n${cssEntry}\n${sharedCss}\n${converter}\n${layout}`;
  assert.equal((page.match(/<section\b/g) ?? []).length, 9);
  assert.match(page, /cdn\.simpleicons\.org/);
  assert.match(cssEntry, /@import "\.\.\/styles\.css"/);
  assert.match(sharedCss, /prefers-color-scheme:\s*dark/);
  assert.match(sharedCss, /prefers-reduced-motion:\s*reduce/);
  assert.match(sharedCss, /100dvh/);
  assert.match(sharedCss, /animation-timeline:\s*view/);
  assert.match(converter, /AnalysisStatus = "idle" \| "loading" \| "ready" \| "error"/);
  assert.match(converter, /role="alert"/);
  assert.doesNotMatch(converter, /new FormData\(\)|\/api\/uploads|type="file"/);
  assert.doesNotMatch(source, /[\u2013\u2014]/u);
  assert.doesNotMatch(source, /h-screen|window\.addEventListener\(['"]scroll/);
});
