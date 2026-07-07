import { defineConfig } from "oxlint";
import astro from "ultracite/oxlint/astro";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, astro, react],
  ignorePatterns: core.ignorePatterns,
  rules: {
    "github/filenames-match-regex": "off",
    "react-doctor/only-export-components": "off",
    "sonarjs/function-name": "off",
    "sonarjs/no-wildcard-import": "off",
  },
});
