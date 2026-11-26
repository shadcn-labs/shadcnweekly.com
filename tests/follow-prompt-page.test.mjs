import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(import.meta.dirname, "..");

describe("follow prompt placement", () => {
  it("is mounted by the shared site layout", async () => {
    const layout = await readFile(
      path.join(root, "src/layouts/site.astro"),
      "utf-8"
    );
    assert.match(layout, /<FollowPrompt client:load \/>/u);
  });

  it("links to a subscribe anchor that exists on the homepage", async () => {
    const prompt = await readFile(
      path.join(root, "src/components/follow-prompt.tsx"),
      "utf-8"
    );
    const home = await readFile(
      path.join(root, "src/pages/index.astro"),
      "utf-8"
    );

    assert.match(prompt, /href="\/#subscribe"/u);
    assert.match(home, /id="subscribe"/u);
  });

  it("uses short labels for the social actions", async () => {
    const prompt = await readFile(
      path.join(root, "src/components/follow-prompt.tsx"),
      "utf-8"
    );

    assert.match(prompt, /<XLogo \/>\s*Follow\s*<\/a>/u);
    assert.match(prompt, /Star\s*<\/a>/u);
  });
});
