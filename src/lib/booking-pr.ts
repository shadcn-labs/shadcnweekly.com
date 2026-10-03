import type { SponsorBooking } from "@/constants/sponsor-bookings";
import {
  bookedWeeks,
  sponsorBookingSchema,
  weekStart,
} from "@/constants/sponsor-bookings";

/**
 * Opens a pull request adding a paid booking to
 * `src/data/sponsor-bookings.json`. Every step is idempotent (keyed by the
 * Dodo payment ID), so webhook retries complete a partial run instead of
 * duplicating it. Env: GITHUB_BOOKINGS_TOKEN (fine-grained token with
 * Contents + Pull requests read/write on this repository).
 */

const REPO = "shadcn-labs/shadcnweekly.com";
/** Target branch for booking PRs; override to test against a staging branch. */
const BASE = process.env.BOOKINGS_BASE_BRANCH || "main";
const BOOKINGS_PATH = "src/data/sponsor-bookings.json";
const FROM_WEBSITE = "(from website)";

const github = async <T>(
  path: string,
  init: RequestInit = {},
  { allow404 = false } = {}
): Promise<T | null> => {
  const response = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_BOOKINGS_TOKEN}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (allow404 && response.status === 404) {
    return null;
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `GitHub ${init.method ?? "GET"} ${path} failed (${response.status}): ${detail.slice(0, 300)}`
    );
  }
  return (await response.json()) as T;
};

const readBookings = async (ref: string) => {
  const file = await github<{ content: string; sha: string }>(
    `/contents/${BOOKINGS_PATH}?ref=${encodeURIComponent(ref)}`
  );
  if (!file) {
    throw new Error(`${BOOKINGS_PATH} not found on ${ref}`);
  }
  const bookings = sponsorBookingSchema
    .array()
    .parse(JSON.parse(Buffer.from(file.content, "base64").toString("utf-8")));
  return { bookings, sha: file.sha };
};

/** Weeks of `booking` already taken by another booking for the same slot. */
export const conflictingWeeks = (
  booking: SponsorBooking,
  existing: SponsorBooking[]
) => {
  const taken = bookedWeeks(
    booking.placement,
    existing.filter((entry) => entry.paymentId !== booking.paymentId)
  );
  return booking.weeks.filter((week) => taken.has(weekStart(week)));
};

export const openBookingPullRequest = async (
  booking: SponsorBooking & { paymentId: string }
): Promise<{ url: string; created: boolean }> => {
  const branch = `sponsor/${booking.paymentId}`;

  const existingRef = await github(
    `/git/ref/heads/${branch}`,
    {},
    {
      allow404: true,
    }
  );
  if (!existingRef) {
    const base = await github<{ object: { sha: string } }>(
      `/git/ref/heads/${BASE}`
    );
    await github("/git/refs", {
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: base?.object.sha,
      }),
      method: "POST",
    });
  }

  const { bookings, sha } = await readBookings(branch);
  if (!bookings.some((entry) => entry.paymentId === booking.paymentId)) {
    const next = [...bookings, booking];
    await github(`/contents/${BOOKINGS_PATH}`, {
      body: JSON.stringify({
        branch,
        content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`).toString(
          "base64"
        ),
        message: `feat: book ${booking.placement} sponsor ${booking.name ?? booking.website}`,
        sha,
      }),
      method: "PUT",
    });
  }

  const [owner] = REPO.split("/");
  const open = await github<{ html_url: string }[]>(
    `/pulls?state=open&head=${owner}:${encodeURIComponent(branch)}`
  );
  const [existingPr] = open ?? [];
  if (existingPr) {
    return { created: false, url: existingPr.html_url };
  }

  const { bookings: onMain } = await readBookings(BASE);
  const conflicts = conflictingWeeks(booking, onMain);
  const body = [
    `Paid sponsor booking from Dodo payment \`${booking.paymentId}\` (look up the buyer in the Dodo dashboard).`,
    "",
    `- **Placement:** ${booking.placement}`,
    `- **Weeks:** ${booking.weeks.join(", ")}`,
    `- **Website:** ${booking.website}`,
    `- **Name:** ${booking.name ?? FROM_WEBSITE}`,
    `- **Headline:** ${booking.title ?? FROM_WEBSITE}`,
    `- **Description:** ${booking.description ?? FROM_WEBSITE}`,
    `- **Image:** ${booking.image ?? "(website preview image)"}`,
    "",
    conflicts.length > 0
      ? `> [!WARNING]\n> Already booked on \`${BASE}\` for ${conflicts.join(", ")}. Move this booking to free weeks (or refund) before merging.`
      : `No conflicts with bookings on \`${BASE}\`.`,
    "",
    "Review the copy, then merge to schedule it. Issues drafted for these weeks will include the sponsor automatically.",
  ].join("\n");
  const created = await github<{ html_url: string }>("/pulls", {
    body: JSON.stringify({
      base: BASE,
      body,
      head: branch,
      title: `Sponsor booking: ${booking.name ?? new URL(booking.website).hostname} (${booking.placement}, ${booking.weeks.join(", ")})`,
    }),
    method: "POST",
  });
  return { created: true, url: created?.html_url ?? "" };
};
