import type { APIRoute } from "astro";

export const prerender = false;

const safeJson = async (res: Response) => {
  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

// oxlint-disable-next-line sonarjs/function-name
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      throw new Error("Please provide an email");
    }

    const apiKey = import.meta.env.KIT_API_KEY as string;
    const formId = import.meta.env.KIT_FORM_ID as string;

    const createRes = await fetch("https://api.kit.com/v4/subscribers", {
      body: JSON.stringify({ email_address: email }),
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
      },
      method: "POST",
    });

    if (!createRes.ok) {
      const data = await safeJson(createRes);
      throw new Error(data.errors?.[0] || "Failed to create subscriber");
    }

    const formRes = await fetch(
      `https://api.kit.com/v4/forms/${formId}/subscribers`,
      {
        body: JSON.stringify({ email_address: email }),
        headers: {
          "Content-Type": "application/json",
          "X-Kit-Api-Key": apiKey,
        },
        method: "POST",
      }
    );

    if (!formRes.ok) {
      const data = await safeJson(formRes);
      throw new Error(data.errors?.[0] || "Failed to subscribe to form");
    }

    return Response.json({
      message: "Thanks! Please check your email to confirm your subscription.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "There is an unexpected error";
    return Response.json({ message }, { status: 400 });
  }
};
