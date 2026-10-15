import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LINKS } from "@/constants/links";
import { formatStars, formatStarsFull } from "@/lib/github-stars";
import { cn } from "@/lib/utils";

export const FooterSocials = ({ stars }: { stars: number | null }) => {
  const showStars = stars !== null && stars > 0;
  const githubLabel = showStars ? formatStarsFull(stars) : "Star on GitHub";

  return (
    <TooltipProvider>
      <div className="-ml-2 flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={LINKS.GITHUB}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={
                  showStars
                    ? `GitHub repository (${formatStarsFull(stars)})`
                    : "GitHub repository"
                }
                className={cn(
                  buttonVariants({
                    size: showStars ? "default" : "icon",
                    variant: "ghost",
                  }),
                  showStars && "px-2",
                  "font-normal"
                )}
              />
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
            </svg>
            {showStars ? (
              <span className="text-sm tabular-nums" aria-hidden="true">
                {formatStars(stars)}
              </span>
            ) : null}
          </TooltipTrigger>
          <TooltipContent side="bottom">{githubLabel}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <a
                href={LINKS.X_FOLLOW}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Shadcn Weekly on X"
                className={buttonVariants({ size: "icon", variant: "ghost" })}
              />
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
            </svg>
          </TooltipTrigger>
          <TooltipContent side="bottom">Follow on X</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
