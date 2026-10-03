import { z } from "zod";

import { OFFER_IDS } from "@/constants/sponsor";
import { httpUrl } from "@/constants/sponsor-bookings";

/** Shared by the sponsor modal (client validation) and the checkout API. */

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const sponsorCheckoutSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(200, "Description must be 200 characters or less"),
  email: z.email("Please enter a valid email address"),
  image: z.preprocess(emptyToUndefined, httpUrl.optional()),
  name: z
    .string()
    .trim()
    .min(1, "Product name is required")
    .max(45, "Product name must be 45 characters or less"),
  offer: z.enum(OFFER_IDS),
  title: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(80, "Headline must be 80 characters or less")
      .optional()
  ),
  website: httpUrl,
  weeks: z
    .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/u))
    .min(1, "Pick your issue week(s)")
    .max(4),
});

export type SponsorCheckoutRequest = z.infer<typeof sponsorCheckoutSchema>;
