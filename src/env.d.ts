/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** True when the request prefers `text/markdown` over `text/html`. */
    prefersMarkdown: boolean;
  }
}
