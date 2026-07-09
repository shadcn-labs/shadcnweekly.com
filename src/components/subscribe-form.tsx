import { zodResolver } from "@hookform/resolvers/zod";
import { BorderBeam } from "border-beam";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants/routes";

const subscribeSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
});

type SubscribeFormData = z.infer<typeof subscribeSchema>;

export const SubscribeForm = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const form = useForm<SubscribeFormData>({
    defaultValues: { email: "" },
    resolver: zodResolver(subscribeSchema),
  });

  const onSubmit = async (data: SubscribeFormData) => {
    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const res = await fetch(ROUTES.SUBSCRIBE_API, {
        body: JSON.stringify({ email: data.email }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "Something went wrong");
      }

      setSubscribed(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Something went wrong"
      );
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <div className="mb-6">
        <p className="font-semibold text-lg">Thanks for subscribing! 🎉</p>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent you an email to{" "}
          <strong className="text-foreground">confirm your address</strong>. If
          you don&apos;t receive it please also check your SPAM.
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <BorderBeam
        className="w-full"
        size="md"
        duration={4}
        colorVariant="colorful"
      >
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex items-center rounded-full border border-border bg-background p-1"
        >
          <input
            {...form.register("email")}
            type="email"
            placeholder="Enter your email"
            disabled={loading}
            className="w-0 min-w-0 flex-1 bg-transparent pl-3 pr-4 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="shrink-0 whitespace-nowrap rounded-full"
          >
            {loading ? "Subscribing..." : "Subscribe"}
          </Button>
        </form>
      </BorderBeam>
      {form.formState.errors.email && (
        <p className="text-xs text-red-500">
          {form.formState.errors.email.message}
        </p>
      )}
      {message && isError && <p className="text-xs text-red-500">{message}</p>}
    </div>
  );
};
