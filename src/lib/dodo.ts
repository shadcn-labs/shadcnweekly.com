import { createHmac, timingSafeEqual } from "node:crypto";

import type { SponsorPlacementOffer } from "@/constants/sponsor";
import { dodoProductEnv } from "@/constants/sponsor";

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

const apiBase = () =>
  process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export const dodoProductId = (offer: SponsorPlacementOffer["id"]) => {
  const name = dodoProductEnv(offer);
  const id = process.env[name];
  if (!id) {
    throw new Error(`${name} is not set`);
  }
  return id;
};

export const createCheckoutSession = async (request: {
  productId: string;
  email: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<{ checkoutUrl: string; sessionId: string }> => {
  const response = await fetch(`${apiBase()}/checkouts`, {
    body: JSON.stringify({
      customer: { email: request.email },
      metadata: request.metadata,
      product_cart: [{ product_id: request.productId, quantity: 1 }],
      return_url: request.returnUrl,
    }),
    headers: {
      Authorization: `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `Dodo checkout failed (${response.status}): ${text.slice(0, 300)}`
    );
  }
  const session = JSON.parse(text) as {
    checkout_url?: string | null;
    session_id: string;
  };
  if (!session.checkout_url) {
    throw new Error("Dodo returned no checkout_url");
  }
  return { checkoutUrl: session.checkout_url, sessionId: session.session_id };
};

export const verifyDodoWebhook = (input: {
  body: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}) => {
  const { body, id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature) {
    return false;
  }
  const sentAt = Number(timestamp);
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (
    !Number.isFinite(sentAt) ||
    Math.abs(now - sentAt) > WEBHOOK_TOLERANCE_SECONDS
  ) {
    return false;
  }
  const key = Buffer.from(secret.replace(/^whsec_/u, ""), "base64");
  const expected = Buffer.from(
    createHmac("sha256", key)
      .update(`${id}.${timestamp}.${body}`)
      .digest("base64")
  );
  return signature.split(" ").some((entry) => {
    const [version, value] = entry.split(",");
    const candidate = Buffer.from(value ?? "");
    return (
      version === "v1" &&
      candidate.length === expected.length &&
      timingSafeEqual(candidate, expected)
    );
  });
};
