export const NEXT_ISSUE_NUMBER = 1;
export const NEXT_ISSUE_DATE = "July 13, 2026";
export const NEXT_ISSUE_DATE_ISO = "2026-07-13";

export const SPONSOR_PLACEMENTS = [
  {
    description:
      'Top of the newsletter with "Together with" and an image + text placement in the first half. The spot every reader sees.',
    features: [
      "Above the fold placement",
      "Image + text format",
      "Best for product launches",
    ],
    paymentUrl: "",
    price: 100,
    tag: "Premium",
    title: "1st Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $50/slot. Copy can change per placement.",
    features: ["4 issues prepaid", "$50 per placement", "Save 50%"],
    paymentUrl: "",
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
    paymentUrl: "",
    price: 50,
    tag: "",
    title: "2nd Sponsor",
  },
  {
    description:
      "Same as above, 4 issues. Brings it down to $25/slot. Copy can change per placement.",
    features: ["4 issues prepaid", "$25 per placement", "Save 50%"],
    paymentUrl: "",
    price: 100,
    tag: "",
    title: "2nd Sponsor Bundle",
  },
] as const;
