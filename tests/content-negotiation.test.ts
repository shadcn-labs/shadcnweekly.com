import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appendVaryAccept,
  appendVaryUserAgent,
  HTML,
  MARKDOWN,
  preferredType,
  prefersMarkdown,
} from "../src/lib/content-negotiation.ts";

describe("preferredType", () => {
  it("defaults to HTML without an Accept header", () => {
    assert.equal(preferredType(null), HTML);
    assert.equal(preferredType(""), HTML);
  });

  it("serves HTML to browsers", () => {
    assert.equal(
      preferredType(
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,*/*;q=0.8"
      ),
      HTML
    );
  });

  it("serves Markdown when Markdown is requested", () => {
    assert.equal(preferredType("text/markdown"), MARKDOWN);
    assert.equal(preferredType("text/markdown; charset=utf-8"), MARKDOWN);
  });

  it("treats the type case-insensitively", () => {
    assert.equal(preferredType("TEXT/MARKDOWN"), MARKDOWN);
  });

  it("breaks equal-weight ties by client order", () => {
    assert.equal(preferredType("text/markdown, text/html, */*"), MARKDOWN);
    assert.equal(preferredType("text/html, text/markdown"), HTML);
  });

  it("falls back to HTML for a bare wildcard", () => {
    assert.equal(preferredType("*/*"), HTML);
    assert.equal(preferredType("text/*"), HTML);
  });

  it("honors q-values", () => {
    assert.equal(
      preferredType("text/markdown;q=0.9, text/html;q=0.8"),
      MARKDOWN
    );
    assert.equal(preferredType("text/markdown;q=0.5, text/html;q=0.9"), HTML);
  });

  it("lets a specific range override a wildcard, including q=0", () => {
    assert.equal(preferredType("text/html;q=0, */*;q=1"), MARKDOWN);
    assert.equal(preferredType("text/markdown;q=0, */*;q=1"), HTML);
  });

  it("returns null when nothing acceptable is produced", () => {
    assert.equal(preferredType("application/json"), null);
    assert.equal(preferredType("text/html;q=0, text/markdown;q=0"), null);
  });

  it("ignores unsupported ranges that are listed alongside Markdown", () => {
    assert.equal(preferredType("application/json, text/markdown"), MARKDOWN);
  });

  it("clamps out-of-range q-values", () => {
    assert.equal(preferredType("text/markdown;q=2"), MARKDOWN);
    assert.equal(preferredType("text/markdown;q=-1, text/html;q=0"), null);
  });
});

describe("prefersMarkdown", () => {
  it("is true only when Markdown wins", () => {
    assert.equal(prefersMarkdown("text/markdown"), true);
    assert.equal(prefersMarkdown("text/html"), false);
    assert.equal(prefersMarkdown(null), false);
    assert.equal(prefersMarkdown("application/json"), false);
  });
});

describe("appendVaryAccept", () => {
  it("sets Vary when missing", () => {
    const headers = new Headers();
    appendVaryAccept(headers);
    assert.equal(headers.get("Vary"), "Accept");
  });

  it("appends Accept to an existing Vary value", () => {
    const headers = new Headers({ Vary: "Origin" });
    appendVaryAccept(headers);
    assert.equal(headers.get("Vary"), "Origin, Accept");
  });

  it("does not duplicate Accept", () => {
    const headers = new Headers({ Vary: "accept" });
    appendVaryAccept(headers);
    assert.equal(headers.get("Vary"), "accept");

    const mixed = new Headers({ Vary: "Origin, ACCEPT" });
    appendVaryAccept(mixed);
    assert.equal(mixed.get("Vary"), "Origin, ACCEPT");
  });
});

describe("appendVaryUserAgent", () => {
  it("sets Vary when missing", () => {
    const headers = new Headers();
    appendVaryUserAgent(headers);
    assert.equal(headers.get("Vary"), "User-Agent");
  });

  it("appends User-Agent after Accept", () => {
    const headers = new Headers({ Vary: "Accept" });
    appendVaryUserAgent(headers);
    assert.equal(headers.get("Vary"), "Accept, User-Agent");
  });

  it("does not duplicate User-Agent", () => {
    const headers = new Headers({ Vary: "accept, user-agent" });
    appendVaryUserAgent(headers);
    assert.equal(headers.get("Vary"), "accept, user-agent");
  });
});
