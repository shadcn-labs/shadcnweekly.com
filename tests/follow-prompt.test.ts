import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DAY_MS,
  DELAY_MS,
  DISMISSED_KEY,
  wasRecentlyDismissed,
} from "../src/lib/follow-prompt.ts";

const NOW = 1_700_000_000_000;

describe("wasRecentlyDismissed", () => {
  it("is false when the prompt was never dismissed", () => {
    assert.equal(wasRecentlyDismissed(null, NOW), false);
    assert.equal(wasRecentlyDismissed(undefined, NOW), false);
  });

  it("is true inside the 24-hour window", () => {
    assert.equal(wasRecentlyDismissed(NOW - 1, NOW), true);
    assert.equal(wasRecentlyDismissed(NOW - DAY_MS + 1, NOW), true);
  });

  it("is false once the window has passed", () => {
    assert.equal(wasRecentlyDismissed(NOW - DAY_MS, NOW), false);
    assert.equal(wasRecentlyDismissed(NOW - DAY_MS - 1, NOW), false);
  });

  it("ignores invalid timestamps", () => {
    assert.equal(wasRecentlyDismissed(Number.NaN, NOW), false);
    assert.equal(wasRecentlyDismissed(Number.POSITIVE_INFINITY, NOW), false);
  });

  it("uses the expected delay and storage key", () => {
    assert.equal(DELAY_MS, 15_000);
    assert.equal(DISMISSED_KEY, "shadcnweekly:follow-prompt-dismissed");
  });
});
