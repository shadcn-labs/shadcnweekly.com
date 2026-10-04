import { z } from "zod";

import bookingsData from "../data/sponsor-bookings.json" with { type: "json" };

/**
 * Sponsor schedule, stored in `src/data/sponsor-bookings.json` so the Dodo
 * webhook can add paid bookings by pull request. Read by the issue drafter
 * (`scripts/newsletter/draft.ts`), the /sponsor page and the checkout API.
 *
 * - `primary`: "Together with" in the issue header plus the sponsor block in
 *   the first half (the "1st Sponsor" placement).
 * - `secondary`: sponsor block after "Projects, Packages & Tools" (the
 *   "2nd Sponsor" placement).
 *
 * `weeks` holds the Monday (YYYY-MM-DD) of each issue week the booking runs;
 * any date inside a Monday–Sunday week matches that week. Unset `name` /
 * `title` / `description` / `image` are read from the sponsor's website
 * metadata at build time. Add bookings by hand for deals made off-site.
 */
/** Sponsor links render as hrefs on the site and in email: http(s) only. */
export const httpUrl = z.url({ protocol: /^https?$/u }).max(500);

export const sponsorContentSchema = z.object({
  description: z.string().min(10).max(200).optional(),
  image: httpUrl.optional(),
  name: z.string().min(1).max(45).optional(),
  title: z.string().min(1).max(80).optional(),
  website: httpUrl,
});

export const sponsorPlacementSchema = z.enum(["primary", "secondary"]);

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Use YYYY-MM-DD");

export const sponsorBookingSchema = sponsorContentSchema.extend({
  /** Dodo payment that bought this booking; absent for manual bookings. */
  paymentId: z.string().optional(),
  placement: sponsorPlacementSchema,
  weeks: z.array(isoDateSchema).min(1),
});

export type SponsorContent = z.infer<typeof sponsorContentSchema>;
export type SponsorPlacement = z.infer<typeof sponsorPlacementSchema>;
export type SponsorBooking = z.infer<typeof sponsorBookingSchema>;

/** Fails the build on a malformed booking instead of sending a broken issue. */
export const SPONSOR_BOOKINGS: SponsorBooking[] = z
  .array(sponsorBookingSchema)
  .parse(bookingsData);

/** Fills the primary slot in weeks without a primary booking. */
export const HOUSE_SPONSOR: SponsorContent = {
  description: "Pushing the limits of the shadcn/ui ecosystem.",
  website: "https://www.shadcn-labs.com",
};

const DAY_MS = 86_400_000;

/** Monday (YYYY-MM-DD, UTC) of the week containing `isoDate`. */
export const weekStart = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
};

/** Mondays of issue weeks already taken for `placement`. */
export const bookedWeeks = (
  placement: SponsorPlacement,
  bookings: SponsorBooking[] = SPONSOR_BOOKINGS
) => {
  const taken = new Set<string>();
  for (const booking of bookings) {
    if (booking.placement === placement) {
      for (const week of booking.weeks) {
        taken.add(weekStart(week));
      }
    }
  }
  return taken;
};

/** Time to review and merge a booking PR before that week's issue is drafted. */
const MIN_LEAD_DAYS = 3;

/**
 * Upcoming issue Mondays open for every one of `placements`: the next `count`
 * Mondays at least MIN_LEAD_DAYS after `today`, minus weeks booked in any of
 * them.
 */
export const availableWeeks = (
  placements: readonly SponsorPlacement[],
  { count = 12, today = new Date(), bookings = SPONSOR_BOOKINGS } = {}
) => {
  const taken = new Set(
    placements.flatMap((placement) => [...bookedWeeks(placement, bookings)])
  );
  const earliest = today.getTime() + MIN_LEAD_DAYS * DAY_MS;
  const thisMonday = weekStart(today.toISOString().slice(0, 10));
  let monday = Date.parse(`${thisMonday}T00:00:00Z`) + 7 * DAY_MS;
  if (monday < earliest) {
    monday += 7 * DAY_MS;
  }
  const open: string[] = [];
  for (let index = 0; index < count; index += 1, monday += 7 * DAY_MS) {
    const week = new Date(monday).toISOString().slice(0, 10);
    if (!taken.has(week)) {
      open.push(week);
    }
  }
  return open;
};
