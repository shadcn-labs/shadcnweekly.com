import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Tooltip around server-rendered content (e.g. an Astro link) passed as children. */
export const LinkTooltip = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);
