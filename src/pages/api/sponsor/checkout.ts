import type { APIRoute } from "astro";

import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import { SPONSOR_PLACEMENTS } from "@/constants/sponsor";
import { availableWeeks } from "@/constants/sponsor-bookings";
import { createCheckoutSession, dodoProductId } from "@/lib/dodo";
import { sponsorCheckoutSchema } from "@/lib/sponsor-checkout";

export const prerender = false;

const reply = (status: number, body: Record<string, string>) =>
  Response.json(body, { status });

/**
 * Validates a sponsor booking and starts a Dodo checkout. The booking travels
 * as checkout metadata; the webhook (`/api/sponsor/webhook`) turns the paid
 * payment into a booking pull request.
 */
export const POST: APIRoute = async ({ request, url }) => {
  let input: unknown = null;
  try {
    input = await request.json();
  } catch {
    return reply(400, { message: "Invalid request" });
  }
  const parsed = sponsorCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return reply(400, {
      message: parsed.error.issues[0]?.message ?? "Invalid booking",
    });
  }
  const booking = parsed.data;
  const offer = SPONSOR_PLACEMENTS.find((entry) => entry.id === booking.offer);
  if (!offer) {
    return reply(400, { message: "Unknown placement" });
  }

  const weeks = [...new Set(booking.weeks)].toSorted();
  if (weeks.length !== offer.issues) {
    return reply(400, {
      message: `Pick ${offer.issues} issue week${offer.issues === 1 ? "" : "s"}`,
    });
  }
  const open = new Set(availableWeeks(offer.placement));
  const taken = weeks.filter((week) => !open.has(week));
  if (taken.length > 0) {
    return reply(409, {
      message: `No longer available: ${taken.join(", ")}. Pick another week.`,
    });
  }

  const productId = dodoProductId(offer.id);
  if (!productId) {
    return reply(503, {
      message: `Online booking isn't available yet. Email ${LINKS.EMAIL} to book.`,
    });
  }

  try {
    const { checkoutUrl } = await createCheckoutSession({
      email: booking.email,
      metadata: {
        kind: "sponsor_booking",
        offer: offer.id,
        placement: offer.placement,
        website: booking.website,
        weeks: weeks.join(","),
        ...(booking.name ? { name: booking.name } : {}),
        ...(booking.title ? { title: booking.title } : {}),
        ...(booking.description ? { description: booking.description } : {}),
        ...(booking.image ? { image: booking.image } : {}),
      },
      productId,
      returnUrl: `${url.origin}${ROUTES.SPONSOR_THANKS}`,
    });
    return reply(200, { checkoutUrl });
  } catch (error) {
    console.error("Sponsor checkout failed", error);
    return reply(502, {
      message: `Checkout is unavailable right now. Email ${LINKS.EMAIL} to book.`,
    });
  }
};
