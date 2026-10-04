import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightIcon, CheckIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LINKS } from "@/constants/links";
import { ROUTES } from "@/constants/routes";
import type { SponsorPlacementOffer } from "@/constants/sponsor";
import { sponsorCheckoutSchema } from "@/lib/sponsor-checkout";
import { cn } from "@/lib/utils";

/** Selectable tiles (placements, weeks), with the site's neutral selected state. */
const TILE_CLASS =
  "flex items-center justify-between rounded-lg border text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50";
const TILE_SELECTED_CLASS = "border-foreground bg-muted";
const STEP_CLASS = "text-sm font-medium transition-colors";
const STEP_IDLE_CLASS = "text-muted-foreground hover:text-foreground";

/** An offer as rendered on /sponsor, with build-time availability. */
export interface SponsorOffer {
  id: SponsorPlacementOffer["id"];
  title: string;
  description: string;
  price: number;
  issues: SponsorPlacementOffer["issues"];
  tag: SponsorPlacementOffer["tag"];
  /** Open issue Mondays (YYYY-MM-DD) for this offer's slot. */
  weeks: string[];
}

const detailsSchema = sponsorCheckoutSchema.omit({ offer: true, weeks: true });

type DetailsFormInput = {
  [Key in keyof typeof detailsSchema.shape]: string;
};

const formatWeek = (monday: string) =>
  new Date(`${monday}T00:00:00Z`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  });

const mailtoHref = (offer: SponsorOffer) => {
  const subject = encodeURIComponent(`Sponsor booking: ${offer.title}`);
  return `mailto:${LINKS.EMAIL}?subject=${subject}`;
};

const TextField = ({
  control,
  name,
  label,
  required = false,
  max,
  placeholder,
  description,
  type = "text",
  multiline = false,
}: {
  control: Control<DetailsFormInput>;
  name: keyof DetailsFormInput;
  label: string;
  required?: boolean;
  max?: number;
  placeholder?: string;
  description?: string;
  type?: "email" | "text" | "url";
  multiline?: boolean;
}) => (
  <Controller
    name={name}
    control={control}
    render={({ field, fieldState }) => {
      const id = `sponsor-${name}`;
      const inputProps = {
        ...field,
        "aria-invalid": fieldState.invalid,
        id,
        maxLength: max,
        placeholder,
      };
      return (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor={id}>
              {label}{" "}
              {required ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </FieldLabel>
            {max ? (
              <span className="text-xs text-muted-foreground/60">
                {field.value.length}/{max}
              </span>
            ) : null}
          </div>
          {multiline ? (
            <Textarea {...inputProps} rows={3} />
          ) : (
            <Input {...inputProps} type={type} />
          )}
          {description ? (
            <FieldDescription>{description}</FieldDescription>
          ) : null}
          {fieldState.invalid ? (
            <FieldError errors={[fieldState.error]} />
          ) : null}
        </Field>
      );
    }}
  />
);

const DetailsStep = ({ control }: { control: Control<DetailsFormInput> }) => (
  <FieldGroup>
    <TextField
      control={control}
      name="email"
      label="Work email"
      type="email"
      required
      placeholder="you@company.com"
      description="Receipt and booking confirmation go here. Never published."
    />
    <TextField
      control={control}
      name="name"
      label="Product name"
      required
      max={45}
    />
    <TextField
      control={control}
      name="website"
      label="Target URL"
      type="url"
      required
      placeholder="https://yourproduct.com"
      description="Readers go here when they click your sponsorship."
    />
    <TextField
      control={control}
      name="title"
      label="Headline"
      max={80}
      description="Shown under the image. Defaults to your page title."
    />
    <TextField
      control={control}
      name="description"
      label="Description"
      required
      max={200}
      multiline
    />
    <TextField
      control={control}
      name="image"
      label="Image URL"
      type="url"
      placeholder="https://yourproduct.com/banner.png"
      description="PNG or JPG, 1200×630 recommended. Defaults to your site's preview image."
    />
  </FieldGroup>
);

const WeekPicker = ({
  offer,
  selected,
  onToggle,
}: {
  offer: SponsorOffer;
  selected: string[];
  onToggle: (week: string) => void;
}) => (
  <div className="flex flex-col gap-3">
    <p className="text-sm text-muted-foreground">
      Pick {offer.issues === 1 ? "the issue" : `${offer.issues} issues`} to
      appear in. Issues go out on Mondays.
    </p>
    {offer.weeks.length === 0 ? (
      <p className="text-sm">
        No open weeks right now.{" "}
        <a className="link" href={mailtoHref(offer)}>
          Email to book further out
        </a>
        .
      </p>
    ) : (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {offer.weeks.map((week) => {
          const active = selected.includes(week);
          const full = !active && selected.length >= offer.issues;
          return (
            <button
              key={week}
              type="button"
              disabled={full}
              onClick={() => onToggle(week)}
              className={cn(
                TILE_CLASS,
                "px-3 py-2",
                active ? TILE_SELECTED_CLASS : "hover:bg-muted"
              )}
            >
              {formatWeek(week)}
              {active ? <CheckIcon className="size-4" /> : null}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export const SponsorModal = ({
  children,
  offers,
  defaultOffer,
}: {
  children: React.ReactNode;
  offers: SponsorOffer[];
  defaultOffer: SponsorOffer["id"];
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "slot">("details");
  const [offerId, setOfferId] = useState(defaultOffer);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<DetailsFormInput>({
    defaultValues: {
      description: "",
      email: "",
      image: "",
      name: "",
      title: "",
      website: "",
    },
    mode: "onChange",
    resolver: zodResolver(detailsSchema) as never,
  });

  const offer = offers.find((entry) => entry.id === offerId) ?? offers[0];

  const selectOffer = (id: SponsorOffer["id"]) => {
    setOfferId(id);
    setWeeks([]);
    setError("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setStep("details");
      selectOffer(defaultOffer);
      form.reset();
    }
  };

  const toggleWeek = (week: string) =>
    setWeeks((current) =>
      current.includes(week)
        ? current.filter((entry) => entry !== week)
        : [...current, week].toSorted()
    );

  const checkout = form.handleSubmit(async (details) => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(ROUTES.SPONSOR_CHECKOUT_API, {
        body: JSON.stringify({ ...details, offer: offer.id, weeks }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const data = (await response.json()) as {
        checkoutUrl?: string;
        message?: string;
      };
      if (!response.ok || !data.checkoutUrl) {
        throw new Error(data.message ?? "Checkout failed. Please try again.");
      }
      window.location.assign(data.checkoutUrl);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout failed. Please try again."
      );
      setSubmitting(false);
    }
  });

  const detailsValid = form.formState.isValid;
  const weeksComplete = weeks.length === offer.issues;
  const weekUnit = offer.issues === 1 ? "week" : "weeks";
  const progress =
    step === "slot" ? ` · ${weeks.length}/${offer.issues} ${weekUnit}` : "";

  const action =
    step === "details" ? (
      <Button onClick={() => setStep("slot")} disabled={!detailsValid}>
        Pick weeks
        <ArrowRightIcon className="size-4" />
      </Button>
    ) : (
      <Button
        onClick={() => void checkout()}
        disabled={!weeksComplete || submitting}
      >
        {submitting ? "Opening checkout…" : `Pay $${offer.price}`}
      </Button>
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-3xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Book a sponsorship</DialogTitle>
          <DialogDescription>
            Enter your details, pick a placement and issue weeks, then pay.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[520px]">
          <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-muted/50 p-4 sm:flex">
            <p className="text-sm font-medium">Placement</p>
            <div className="flex flex-col gap-2">
              {offers.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectOffer(entry.id)}
                  className={cn(
                    TILE_CLASS,
                    "p-3",
                    offer.id === entry.id
                      ? TILE_SELECTED_CLASS
                      : "bg-background hover:bg-muted"
                  )}
                >
                  <span className="font-medium">{entry.title}</span>
                  <span className="text-muted-foreground">${entry.price}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex items-center gap-2 border-b px-6 py-3">
              <button
                type="button"
                onClick={() => setStep("details")}
                className={cn(
                  STEP_CLASS,
                  step === "details" ? "text-foreground" : STEP_IDLE_CLASS
                )}
              >
                Enter details
              </button>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-3.5 text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => detailsValid && setStep("slot")}
                className={cn(
                  STEP_CLASS,
                  step === "slot" ? "text-foreground" : STEP_IDLE_CLASS,
                  !detailsValid && "pointer-events-none opacity-50"
                )}
              >
                Pick weeks
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {step === "details" ? (
                <DetailsStep control={form.control} />
              ) : (
                <WeekPicker
                  offer={offer}
                  selected={weeks}
                  onToggle={toggleWeek}
                />
              )}
              {error ? (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {offer.title} · ${offer.price}
                {progress}
              </p>
              {action}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
