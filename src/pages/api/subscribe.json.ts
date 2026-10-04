import type { APIRoute } from "astro";

export const prerender = false;

const KIT_API = "https://api.kit.com/v4";

type KitState = "active" | "bounced" | "cancelled" | "complained" | "inactive";

const kit = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(`${KIT_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": import.meta.env.KIT_API_KEY as string,
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(
      data.errors?.[0] || `Kit request failed (${response.status})`
    );
  }
  return data;
};

const reply = (status: number, message: string) =>
  Response.json({ message }, { status });

// oxlint-disable-next-line sonarjs/function-name
export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();
    if (!email) {
      return reply(400, "Please provide an email");
    }

    // Kit's create-subscriber call is an upsert and never reports duplicates,
    // and re-adding to the form can resend the confirmation email. Look the
    // address up first (any state) and stop before touching anything.
    const { subscribers = [] } = (await kit(
      `/subscribers?email_address=${encodeURIComponent(email)}&status=all&slim=true`
    )) as { subscribers?: { state: KitState }[] };
    const state = subscribers[0]?.state;
    if (state === "active") {
      return reply(409, "You're already subscribed. See you on Monday!");
    }
    if (state === "inactive") {
      return reply(
        409,
        "You've already signed up. Check your inbox (and spam folder) for the confirmation email."
      );
    }

    // New, or previously unsubscribed / bounced: (re)subscribe via the form.
    // Created `inactive` because the form uses double opt-in ("Send
    // confirmation email" on, "Auto-confirm" off): Kit sends the confirmation
    // email and activates the subscriber once they click it.
    const body = JSON.stringify({ email_address: email });
    await kit("/subscribers", {
      body: JSON.stringify({ email_address: email, state: "inactive" }),
      method: "POST",
    });
    await kit(`/forms/${import.meta.env.KIT_FORM_ID as string}/subscribers`, {
      body,
      method: "POST",
    });

    return reply(
      200,
      "Thanks! Please check your email to confirm your subscription."
    );
  } catch (error) {
    return reply(
      400,
      error instanceof Error ? error.message : "There is an unexpected error"
    );
  }
};
