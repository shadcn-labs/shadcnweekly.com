import type { SponsorPlacement } from "./sponsor-bookings.ts";

export const OFFER_IDS = [
  "primary",
  "primary-bundle",
  "secondary",
  "secondary-bundle",
  "combo",
] as const;

export const OFFER_TAGS = [
  "",
  "Most Performing",
  "Best Value",
  "Save 20%",
] as const;

export interface SponsorPlacementOffer {
  id: (typeof OFFER_IDS)[number];
  placements: readonly SponsorPlacement[];
  issues: 1 | 4;
  price: number;
  title: string;
  tag: (typeof OFFER_TAGS)[number];
  description: string;
}

export const SPONSOR_PLACEMENTS: readonly SponsorPlacementOffer[] = [
  {
    description:
      'Top of the newsletter with "Together with" and an image + text placement in the first half. The spot every reader sees.',
    id: "primary",
    issues: 1,
    placements: ["primary"],
    price: 100,
    tag: "Most Performing",
    title: "1st Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $50/slot. Copy can change per placement.",
    id: "primary-bundle",
    issues: 4,
    placements: ["primary"],
    price: 200,
    tag: "Best Value",
    title: "1st Sponsor Bundle",
  },
  {
    description:
      'After the "Tools / Projects" section with an image & text. Great for libraries and dev tools.',
    id: "secondary",
    issues: 1,
    placements: ["secondary"],
    price: 50,
    tag: "",
    title: "2nd Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $25/slot. Copy can change per placement.",
    id: "secondary-bundle",
    issues: 4,
    placements: ["secondary"],
    price: 100,
    tag: "",
    title: "2nd Sponsor Bundle",
  },
  {
    description:
      "Both slots in the same issue: the 1st Sponsor spot up top plus the 2nd Sponsor block after Tools / Projects. Twice the exposure for $120 instead of $150.",
    id: "combo",
    issues: 1,
    placements: ["primary", "secondary"],
    price: 120,
    tag: "Save 20%",
    title: "1st + 2nd Sponsor",
  },
];

export const dodoProductEnv = (id: SponsorPlacementOffer["id"]) =>
  `DODO_PRODUCT_${id.toUpperCase().replaceAll("-", "_")}`;
