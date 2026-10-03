/**
 * Sponsor schedule used when the weekly issue is drafted
 * (`scripts/newsletter/draft.ts`).
 *
 * - `primary`: "Together with" in the issue header plus the sponsor block in
 *   the first half (the "1st Sponsor" placement).
 * - `secondary`: sponsor block after "Projects, Packages & Tools" (the
 *   "2nd Sponsor" placement).
 *
 * A booking runs in every week listed in `weeks`; any date inside the target
 * week (Monday–Sunday) works, e.g. the Monday the issue goes out. A 4-issue
 * bundle lists 4 weeks; give each week its own booking when the copy differs.
 *
 * Unset `name` / `title` / `description` / `image` are read from the
 * sponsor's website metadata at build time.
 */
export interface SponsorBooking {
  placement: "primary" | "secondary";
  weeks: string[];
  website: string;
  name?: string;
  title?: string;
  description?: string;
  image?: string;
}

export type SponsorContent = Omit<SponsorBooking, "placement" | "weeks">;

/** Fills the primary slot in weeks without a primary booking. */
export const HOUSE_SPONSOR: SponsorContent = {
  description: "Pushing the limits of the shadcn/ui ecosystem.",
  website: "https://www.shadcn-labs.com",
};

export const SPONSOR_BOOKINGS: SponsorBooking[] = [
  // {
  //   placement: "primary",
  //   weeks: ["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"],
  //   website: "https://example.com/?utm_source=shadcnweekly&utm_medium=newsletter",
  //   title: "Headline shown under the image",
  //   description: "One or two sentences of sponsor copy.",
  //   image: "https://example.com/banner.png",
  // },
];
