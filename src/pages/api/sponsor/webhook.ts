import type { APIRoute } from "astro";

import { sponsorBookingSchema } from "@/constants/sponsor-bookings";
import { openBookingPullRequest } from "@/lib/booking-pr";
import { verifyDodoWebhook } from "@/lib/dodo";

export const prerender = false;

interface DodoEvent {
  type: string;
  data?: {
    payment_id?: string;
    metadata?: Record<string, unknown>;
  };
}

const text = (value: unknown) =>
  typeof value === "string" && value !== "" ? value : undefined;

/**
 * Dodo webhook: a succeeded sponsor payment opens a pull request adding the
 * booking. Non-2xx responses make Dodo retry, which is safe because the PR
 * flow is idempotent per payment.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!secret) {
    console.error("DODO_PAYMENTS_WEBHOOK_KEY is not set");
    return new Response("Webhook not configured", { status: 500 });
  }

  const body = await request.text();
  const verified = verifyDodoWebhook({
    body,
    id: request.headers.get("webhook-id"),
    secret,
    signature: request.headers.get("webhook-signature"),
    timestamp: request.headers.get("webhook-timestamp"),
  });
  if (!verified) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body) as DodoEvent;
  const metadata = event.data?.metadata ?? {};
  if (
    event.type !== "payment.succeeded" ||
    metadata.kind !== "sponsor_booking"
  ) {
    return Response.json({ ignored: event.type });
  }

  const paymentId = event.data?.payment_id;
  // `placement` is comma-separated: the combo offer books both slots.
  const bookings = String(metadata.placement ?? "")
    .split(",")
    .map((placement) =>
      sponsorBookingSchema.safeParse({
        description: text(metadata.description),
        image: text(metadata.image),
        name: text(metadata.name),
        paymentId,
        placement,
        title: text(metadata.title),
        website: metadata.website,
        weeks: String(metadata.weeks ?? "")
          .split(",")
          .filter(Boolean),
      })
    );
  const invalid = bookings.find((booking) => !booking.success);
  if (!paymentId || invalid) {
    console.error("Invalid sponsor booking metadata", invalid?.error?.issues);
    return new Response("Invalid booking metadata", { status: 422 });
  }

  try {
    const pr = await openBookingPullRequest(
      paymentId,
      bookings.flatMap((booking) => (booking.success ? [booking.data] : []))
    );
    return Response.json(pr);
  } catch (error) {
    console.error("Failed to open sponsor booking PR", error);
    return new Response("Booking PR failed", { status: 500 });
  }
};
