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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { sponsorCheckoutSchema } from "@/lib/sponsor-checkout";
import { cn } from "@/lib/utils";

const TITLE = "Book a sponsorship";
const DESCRIPTION =
  "Enter your details, pick a placement and issue weeks, then pay.";

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
  placements: SponsorPlacementOffer["placements"];
  tag: SponsorPlacementOffer["tag"];
  /** Screenshot URLs of the offer's slot in an issue. */
  thumbnail: { light: string; dark: string };
  /** Open issue Mondays (YYYY-MM-DD) for this offer's slot(s). */
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

/**
 * Selectable offer with its slot screenshot: `stacked` (thumbnail above, the
 * desktop sidebar) or `row` (thumbnail beside, the mobile carousel).
 */
const PlacementCard = ({
  offer,
  selected,
  onSelect,
  layout,
}: {
  offer: SponsorOffer;
  selected: boolean;
  onSelect: () => void;
  layout: "stacked" | "row";
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onSelect}
    className={cn(
      "relative flex shrink-0 overflow-hidden rounded-xl border bg-background text-left text-sm transition-colors",
      layout === "stacked" ? "flex-col" : "w-64 snap-start items-center",
      selected
        ? "border-foreground ring-1 ring-foreground"
        : "hover:border-foreground/30"
    )}
  >
    <span
      className={cn(
        "shrink-0 overflow-hidden bg-muted",
        layout === "stacked" ? "h-24 border-b" : "h-20 w-24 border-r"
      )}
    >
      <img
        src={offer.thumbnail.light}
        alt=""
        className="w-full dark:hidden"
        loading="lazy"
      />
      <img
        src={offer.thumbnail.dark}
        alt=""
        className="hidden w-full dark:block"
        loading="lazy"
      />
    </span>
    {selected ? (
      <CheckIcon
        aria-hidden="true"
        className="absolute top-2 right-2 size-5 rounded-full bg-foreground p-1 text-background"
      />
    ) : null}
    <span
      className={cn(
        "flex min-w-0 gap-2 p-3",
        layout === "stacked"
          ? "items-center justify-between"
          : "flex-col items-start pr-8"
      )}
    >
      <span className="font-medium">{offer.title}</span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
        ${offer.price}
      </span>
    </span>
  </button>
);

/**
 * Upsell from a single-slot, single-issue offer to the multi-slot combo,
 * priced against booking each of the combo's slots separately.
 */
const comboUpsell = (offers: SponsorOffer[], offer: SponsorOffer) => {
  const combo = offers.find((entry) => entry.placements.length > 1);
  if (!combo || offer.issues !== 1 || offer.placements.length !== 1) {
    return;
  }
  let listPrice = 0;
  for (const placement of combo.placements) {
    const single = offers.find(
      (entry) =>
        entry.issues === 1 &&
        entry.placements.length === 1 &&
        entry.placements[0] === placement
    );
    listPrice += single?.price ?? 0;
  }
  const savings = listPrice - combo.price;
  if (savings <= 0) {
    return;
  }
  return {
    offer: combo,
    percent: Math.round((savings / listPrice) * 100),
    savings,
  };
};

export const SponsorModal = ({
  children,
  offers,
  defaultOffer,
}: {
  children: React.ReactNode;
  offers: SponsorOffer[];
  defaultOffer: SponsorOffer["id"];
}) => {
  // Desktop on the server, so SSR markup matches the common case.
  const isDesktop = useMediaQuery("(min-width: 640px)", true);
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

  const upsell = comboUpsell(offers, offer);

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

  const steps = (
    <div className="flex shrink-0 items-center gap-2 border-b px-6 py-3">
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
  );

  const stepContent = (
    <>
      {step === "details" ? (
        <DetailsStep control={form.control} />
      ) : (
        <WeekPicker offer={offer} selected={weeks} onToggle={toggleWeek} />
      )}
      {error ? (
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  const summary = (
    <div className="flex min-w-0 flex-col gap-0.5">
      {upsell ? (
        <button
          type="button"
          onClick={() => selectOffer(upsell.offer.id)}
          className="text-left text-sm text-green-700 hover:underline dark:text-green-400"
        >
          <span className="font-semibold">
            Save {upsell.percent}% (${upsell.savings})
          </span>{" "}
          with {upsell.offer.title} for ${upsell.offer.price}.
        </button>
      ) : null}
      <p
        className={cn("text-muted-foreground", upsell ? "text-xs" : "text-sm")}
      >
        {offer.title} · ${offer.price}
        {progress}
      </p>
    </div>
  );

  const footer = isDesktop ? (
    <div className="flex shrink-0 items-center justify-between gap-4 border-t bg-muted/50 px-6 py-4">
      {summary}
      {action}
    </div>
  ) : (
    <div className="flex shrink-0 flex-col gap-3 border-t bg-muted/50 px-6 py-4">
      {summary}
      <div className="grid grid-cols-2 gap-2 *:w-full">
        <DrawerClose render={<Button variant="outline" />}>Close</DrawerClose>
        {action}
      </div>
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
        {/* flex: lets a full-width trigger child (mobile Book CTA) stretch. */}
        <DrawerTrigger nativeButton={false} render={<span className="flex" />}>
          {children}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          {steps}
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {stepContent}
          </div>
          {/* Outside the scroller, so placements stay pinned above the footer. */}
          <div className="flex shrink-0 flex-col gap-3 border-t py-4">
            <p className="px-6 text-sm font-medium">Placements</p>
            <div className="flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 py-0.5">
              {offers.map((entry) => (
                <PlacementCard
                  key={entry.id}
                  offer={entry}
                  selected={offer.id === entry.id}
                  onSelect={() => selectOffer(entry.id)}
                  layout="row"
                />
              ))}
            </div>
          </div>
          {footer}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger nativeButton={false} render={<span />}>
        {children}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-4xl p-0 gap-0 overflow-hidden"
        showCloseButton
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
        </DialogHeader>

        <div className="flex h-[min(680px,calc(100dvh-4rem))] flex-col">
          <div className="flex min-h-0 flex-1">
            {/* Heading outside the scroller, so it stays put while cards scroll. */}
            <div className="flex w-72 shrink-0 flex-col border-r bg-muted/50">
              <p className="shrink-0 p-4 pb-3 text-sm font-medium">
                Placements
              </p>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-0.5 pb-4">
                {offers.map((entry) => (
                  <PlacementCard
                    key={entry.id}
                    offer={entry}
                    selected={offer.id === entry.id}
                    onSelect={() => selectOffer(entry.id)}
                    layout="stacked"
                  />
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              {steps}
              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {stepContent}
              </div>
            </div>
          </div>
          {footer}
        </div>
      </DialogContent>
    </Dialog>
  );
};
