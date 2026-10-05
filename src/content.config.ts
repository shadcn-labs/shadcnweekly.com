import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

import { TOOL_CATEGORIES } from "@/constants/tools";

const archive = defineCollection({
  loader: glob({ base: "./src/content/archive", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    cover: z.string().optional(),
    date: z.coerce.date(),
    description: z.string(),
    highlights: z.array(z.string()).default([]),
    issue: z.number(),
    sponsor: z.url().optional(),
    summary: z
      .object({
        bullets: z.array(z.string()),
        explainer: z.string(),
        overview: z.string(),
      })
      .optional(),
    title: z.string(),
  }),
});

const tools = defineCollection({
  loader: glob({ base: "./src/content/tools", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    category: z.enum(TOOL_CATEGORIES),
    description: z.string(),
    image: z.url().optional(),
    issue: z.number(),
    title: z.string(),
    url: z.url(),
  }),
});

export const collections = { archive, tools };
