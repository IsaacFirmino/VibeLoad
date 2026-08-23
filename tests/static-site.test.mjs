import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";

const root = new URL("../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("provides a complete static GitHub Pages entrypoint", async () => {
  const html = await read("index.html");
  const sectionCount = [...html.matchAll(/<section\b/g)].length;

  assert.match(html, /<!doctype html>/i);
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /src="\.\/script\.js"/);
  assert.match(html, /id="converter-form"/);
  assert.match(html, /id="rights-confirmation"/);
  assert.match(html, /id="media-link"/);
  assert.doesNotMatch(html, /id="media-file"|Enviar arquivo/);
  assert.match(html, /name="vibeload-api-url"/);
  assert.match(html, /public\/vibeload-mark\.svg/);
  assert.doesNotMatch(html, /public\/vibeload-logo\.png/);
  assert.ok(sectionCount >= 8, `expected at least 8 sections, received ${sectionCount}`);
});

test("keeps every referenced local asset available", async () => {
  const html = await read("index.html");
  const paths = [...html.matchAll(/(?:src|href)="\.\/(public\/[^"#?]+)"/g)].map((match) => match[1]);

  assert.ok(paths.length >= 4);
  await Promise.all(paths.map((relativePath) => access(new URL(relativePath, root))));
});

test("ships the converter interaction and branded styling without a framework runtime", async () => {
  const [html, css, script] = await Promise.all([
    read("index.html"),
    read("styles.css"),
    read("script.js"),
  ]);

  assert.doesNotMatch(html, /<script[^>]+(?:next|react)/i);
  assert.match(css, /\.rainbow-button\s*\{/);
  assert.match(css, /--accent:\s*#08afd8/);
  assert.match(css, /@keyframes object-float/);
  assert.match(script, /form\.addEventListener\("submit"/);
  assert.match(script, /apiRequest\("\/api\/analyze"/);
  assert.match(script, /apiRequest\("\/api\/jobs"/);
  assert.doesNotMatch(script, /\/api\/uploads|new FormData\(\)/);
  assert.match(script, /renderQualityOptions\(\)/);
  assert.match(script, /IntersectionObserver/);
});

test("contains a current GitHub Pages deployment workflow", async () => {
  const workflow = await read(".github/workflows/deploy-pages.yml");

  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /path: _site/);
});
