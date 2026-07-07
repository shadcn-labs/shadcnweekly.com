import { CheckIcon, UploadIcon, ArrowRightIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { SPONSOR_PLACEMENTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FormData {
  description: string;
  email: string;
  logo: File | null;
  logoPreview: string;
  productName: string;
  targetUrl: string;
}

const defaultForm: FormData = {
  description: "",
  email: "",
  logo: null,
  logoPreview: "",
  productName: "",
  targetUrl: "",
};

const LogoUpload = ({
  preview,
  onChange,
}: {
  preview: string;
  onChange: (file: File) => void;
}) => (
  <div className="flex flex-col gap-2">
    <label htmlFor="sponsor-logo" className="text-sm font-medium">
      Product / Company Logo <span className="text-destructive">*</span>
    </label>
    <div className="flex items-center gap-4">
      <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border border-dashed bg-muted/30 transition-colors hover:bg-muted/50">
        {preview ? (
          <img
            src={preview}
            alt="Logo preview"
            className="size-full rounded-lg object-cover"
          />
        ) : (
          <UploadIcon className="size-5 text-muted-foreground" />
        )}
        <input
          id="sponsor-logo"
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onChange(file);
            }
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground/60">
        Recommended: 500px x 500px • Max 15mb.
      </p>
    </div>
  </div>
);

const DetailForm = ({
  form,
  onChange,
}: {
  form: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) => (
  <div className="flex flex-col gap-5">
    <LogoUpload
      preview={form.logoPreview}
      onChange={(file) =>
        onChange({
          logo: file,
          logoPreview: URL.createObjectURL(file),
        })
      }
    />

    <div className="flex flex-col gap-2">
      <label htmlFor="sponsor-email" className="text-sm font-medium">
        Work Email <span className="text-destructive">*</span>
      </label>
      <input
        id="sponsor-email"
        type="email"
        value={form.email}
        onChange={(e) => onChange({ email: e.target.value })}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="you@company.com"
      />
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="sponsor-product" className="text-sm font-medium">
          Product Name <span className="text-destructive">*</span>
        </label>
        <span className="text-xs text-muted-foreground/60">
          {form.productName.length}/45
        </span>
      </div>
      <input
        id="sponsor-product"
        type="text"
        maxLength={45}
        value={form.productName}
        onChange={(e) => onChange({ productName: e.target.value })}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="sponsor-desc" className="text-sm font-medium">
          Description <span className="text-destructive">*</span>
        </label>
        <span className="text-xs text-muted-foreground/60">
          {form.description.length}/200
        </span>
      </div>
      <textarea
        id="sponsor-desc"
        maxLength={200}
        rows={3}
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
        className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>

    <div className="flex flex-col gap-2">
      <label htmlFor="sponsor-url" className="text-sm font-medium">
        Target URL <span className="text-destructive">*</span>
      </label>
      <input
        id="sponsor-url"
        type="url"
        value={form.targetUrl}
        onChange={(e) => onChange({ targetUrl: e.target.value })}
        className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder="https://yourproduct.com"
      />
      <p className="text-xs text-muted-foreground/60">
        Users will be taken to this link when they click on your ad.
      </p>
    </div>
  </div>
);

const PlacementSelect = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (title: string) => void;
}) => (
  <div className="flex flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      Select the placement for your sponsorship.
    </p>
    <div className="flex flex-col gap-3">
      {SPONSOR_PLACEMENTS.map((placement) => (
        <button
          key={placement.title}
          type="button"
          onClick={() => onSelect(placement.title)}
          className={cn(
            "flex items-center justify-between rounded-lg border p-4 text-left transition-all",
            selected === placement.title
              ? "border-green-500 bg-green-50 ring-1 ring-green-500/20 dark:bg-green-950/30"
              : "border-border hover:border-border/80 hover:bg-muted/50"
          )}
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{placement.title}</span>
              {placement.tag && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {placement.tag}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {placement.description}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">${placement.price}</span>
            {selected === placement.title && (
              <CheckIcon className="size-4 text-green-600" />
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
);

export const SponsorModal = ({
  children,
  defaultPlacement,
}: {
  children: React.ReactNode;
  defaultPlacement?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"details" | "slot">("details");
  const [selectedPlacement, setSelectedPlacement] = useState<string>(
    defaultPlacement || ""
  );
  const [form, setForm] = useState<FormData>(defaultForm);

  const selected = SPONSOR_PLACEMENTS.find(
    (p) => p.title === selectedPlacement
  );

  const handleFormChange = (updates: Partial<FormData>) =>
    setForm((prev) => ({ ...prev, ...updates }));

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setStep("details");
      setForm(defaultForm);
    }
  };

  const canProceed =
    form.email && form.productName && form.description && form.targetUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<span />}>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-3xl p-0 gap-0 overflow-hidden"
        showCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Sponsor Shadcn Weekly</DialogTitle>
          <DialogDescription>
            Fill in your details and select a sponsorship placement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-[520px]">
          {/* Left sidebar */}
          <div className="hidden w-64 shrink-0 flex-col gap-3 border-r bg-muted/30 p-4 sm:flex">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ad Placements
            </p>
            <div className="flex flex-col gap-2">
              {SPONSOR_PLACEMENTS.map((placement) => (
                <button
                  key={placement.title}
                  type="button"
                  onClick={() => {
                    setSelectedPlacement(placement.title);
                    if (step === "slot") {
                      setStep("details");
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-3 text-left text-sm transition-all",
                    selectedPlacement === placement.title
                      ? "border-green-500 bg-green-50 ring-1 ring-green-500/20 dark:bg-green-950/30"
                      : "border-border hover:border-border/80 hover:bg-muted/50"
                  )}
                >
                  <span className="font-medium">{placement.title}</span>
                  <span className="text-muted-foreground">
                    ${placement.price}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Right side */}
          <div className="flex flex-1 flex-col">
            {/* Steps header */}
            <div className="flex items-center gap-2 border-b px-6 py-3">
              <button
                type="button"
                onClick={() => setStep("details")}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider transition-colors",
                  step === "details"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Enter Details
              </button>
              <span className="text-muted-foreground/40">{">"}</span>
              <button
                type="button"
                onClick={() => canProceed && setStep("slot")}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider transition-colors",
                  step === "slot"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  !canProceed && "pointer-events-none opacity-40"
                )}
              >
                Select Placement
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {step === "details" ? (
                <DetailForm form={form} onChange={handleFormChange} />
              ) : (
                <PlacementSelect
                  selected={selectedPlacement}
                  onSelect={setSelectedPlacement}
                />
              )}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-xs text-muted-foreground/60">
                {selected
                  ? `Selected: ${selected.title} — $${selected.price}/issue`
                  : "Select a placement to continue"}
              </p>
              {step === "details" ? (
                <Button onClick={() => setStep("slot")} disabled={!canProceed}>
                  Select Placement
                  <ArrowRightIcon className="size-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setOpen(false)}
                  disabled={!selectedPlacement}
                >
                  Book — ${selected?.price || 0}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
