import { InfoIcon } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Small focusable info icon that explains a value on hover or focus. */
export const InfoTooltip = ({ label }: { label: string }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex text-muted-foreground/70 transition-colors outline-none hover:text-foreground focus-visible:text-foreground"
          />
        }
      >
        <InfoIcon className="size-3.5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent className="max-w-60 text-balance">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
