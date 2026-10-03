import type { SponsorPlacement } from "./sponsor-bookings.ts";

/** Offer keys; each maps to a Dodo product ID in `DODO_PRODUCT_<ID>`. */
export const OFFER_IDS = [
  "primary",
  "primary-bundle",
  "secondary",
  "secondary-bundle",
] as const;

export interface SponsorPlacementOffer {
  id: (typeof OFFER_IDS)[number];
  placement: SponsorPlacement;
  /** Number of issues (weeks) the buyer picks. */
  issues: 1 | 4;
  /** Display price in USD; the charged amount is the Dodo product's price. */
  price: number;
  title: string;
  tag: "" | "Most Performing" | "Best Value";
  description: string;
  features: readonly string[];
}

export const SPONSOR_PLACEMENTS: readonly SponsorPlacementOffer[] = [
  {
    description:
      'Top of the newsletter with "Together with" and an image + text placement in the first half. The spot every reader sees.',
    features: [
      "Above the fold placement",
      "Image + text format",
      "Best for product launches",
    ],
    id: "primary",
    issues: 1,
    placement: "primary",
    price: 100,
    tag: "Most Performing",
    title: "1st Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $50/slot. Copy can change per placement.",
    features: ["4 issues prepaid", "$50 per placement", "Save 50%"],
    id: "primary-bundle",
    issues: 4,
    placement: "primary",
    price: 200,
    tag: "Best Value",
    title: "1st Sponsor Bundle",
  },
  {
    description:
      'After the "Tools / Projects" section with an image & text. Great for libraries and dev tools.',
    features: [
      "After tools section",
      "Image + text format",
      "High engagement slot",
    ],
    id: "secondary",
    issues: 1,
    placement: "secondary",
    price: 50,
    tag: "",
    title: "2nd Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $25/slot. Copy can change per placement.",
    features: ["4 issues prepaid", "$25 per placement", "Save 50%"],
    id: "secondary-bundle",
    issues: 4,
    placement: "secondary",
    price: 100,
    tag: "",
    title: "2nd Sponsor Bundle",
  },
];

/** Env var holding the Dodo product ID for an offer, e.g. `DODO_PRODUCT_PRIMARY_BUNDLE`. */
export const dodoProductEnv = (id: SponsorPlacementOffer["id"]) =>
  `DODO_PRODUCT_${id.toUpperCase().replaceAll("-", "_")}`;
