import { BorderBeam } from "border-beam";
import { useState } from "react";
import type { SubmitEvent } from "react";

import { Button } from "@/components/ui/button";

export const SubscribeForm = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch("/api/subscribe.json", {
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      setMessage(data.message);
      setEmail("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <BorderBeam
        className="w-full"
        size="md"
        duration={4}
        colorVariant="colorful"
      >
        <form
          onSubmit={onSubmit}
          className="flex items-center rounded-full border border-border bg-background p-1"
        >
          <input
            type="email"
            placeholder="Enter your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="flex-1 bg-transparent pl-3 max-sm:pr-3 pr-4 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="rounded-full max-sm:px-2"
          >
            {loading ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </BorderBeam>
      {message && isError && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
      {message && !isError && (
        <div className="text-center">
          <p className="font-semibold text-lg">Thanks for subscribing! 🎉</p>
          <div className="text-sm text-muted-foreground">
            We&apos;ve sent you an email to{" "}
            <strong className="text-foreground">confirm your address</strong>.
            If you don&apos;t receive it please also check your SPAM.
          </div>
        </div>
      )}
    </div>
  );
};
