import type { APIRoute } from "astro";

export const prerender = false;

// oxlint-disable-next-line sonarjs/function-name
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      throw new Error("Please provide an email");
    }

    const subRes = await fetch(
      `https://api.convertkit.com/v3/subscribers?api_secret=${import.meta.env.CONVERTKIT_SECRET_KEY}&email_address=${email}`
    );

    if (!subRes.ok) {
      throw new Error("Something went wrong");
    }

    const subData = await subRes.json();
    const isSubscribed = subData.total_subscribers > 0;

    if (isSubscribed) {
      return Response.json({ message: "You're already subscribed!" });
    }

    const res = await fetch(
      `https://api.convertkit.com/v3/forms/${import.meta.env.CONVERTKIT_FORM_ID}/subscribe`,
      {
        body: JSON.stringify({
          api_key: import.meta.env.CONVERTKIT_API_KEY,
          email,
        }),
        headers: { "Content-Type": "application/json; charset=utf-8" },
        method: "POST",
      }
    );

    if (!res.ok) {
      throw new Error("Something went wrong with your subscription");
    }

    const resData = await res.json();

    if (resData.error) {
      throw new Error(resData.error.message);
    }

    return Response.json({
      message: "Thanks! Please check your email to confirm your subscription.",
    });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(null, { status: 400, statusText: error.message });
    }
    return new Response(null, {
      status: 400,
      statusText: "There is an unexpected error",
    });
  }
};
