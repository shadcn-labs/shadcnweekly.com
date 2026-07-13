import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

const archive = defineCollection({
  loader: glob({ base: "./src/content/archive", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    cover: z.string().optional(),
    date: z.coerce.date(),
    description: z.string(),
    highlights: z.array(z.string()).default([]),
    issue: z.number(),
    title: z.string(),
  }),
});

export const collections = { archive };
