import { NewspaperIcon, XIcon } from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import { useEffect, useState } from "react";

import { GithubIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { LINKS } from "@/constants/links";
import {
  DELAY_MS,
  readDismissedAt,
  rememberDismissal,
  wasRecentlyDismissed,
} from "@/lib/follow-prompt";
import { cn } from "@/lib/utils";

const spring = { damping: 32, stiffness: 420, type: "spring" } as const;

const XLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={cn("size-3.5", className)}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

/**
 * Site-wide, non-modal prompt shown after a short delay. Subscribing is the
 * primary action; following on X and starring the repo are secondary. A
 * dismissal (close, Escape, or any action) hides it for a day.
 */
export const FollowPrompt = () => {
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (wasRecentlyDismissed(readDismissedAt())) {
      return;
    }

    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setOpen(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open ? (
          <m.dialog
            open
            aria-labelledby="follow-prompt-title"
            aria-describedby="follow-prompt-body"
            initial={reduceMotion ? { opacity: 0 } : { x: "120%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "120%" }}
            transition={reduceMotion ? { duration: 0.15 } : spring}
            className="bg-popover text-popover-foreground shadow-xl ring-border/50 fixed right-4 bottom-4 left-auto z-50 m-0 flex w-[calc(100vw-2rem)] flex-col gap-3 rounded-2xl border-0 p-3 ring-1 sm:right-6 sm:bottom-6 sm:w-80 print:hidden"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring absolute top-2 right-2 grid size-8 place-items-center rounded-full transition-colors outline-none focus-visible:ring-2"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>

            <div className="flex flex-col gap-1 px-1 pt-1">
              <Logo className="text-primary mb-2 size-5 w-10" />
              <h2
                id="follow-prompt-title"
                className="text-[15px] font-semibold tracking-tight"
              >
                Keep up with shadcn/ui
              </h2>
              <p
                id="follow-prompt-body"
                className="text-muted-foreground text-sm text-pretty"
              >
                Get every issue in your inbox. Follow on X for daily links, or
                star the repo on GitHub.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href="/#subscribe"
                onClick={dismiss}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full justify-center"
                )}
              >
                <NewspaperIcon aria-hidden="true" className="size-4" />
                Subscribe weekly
              </a>
              <div className="flex gap-2">
                <a
                  href={LINKS.X_FOLLOW}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  data-track="follow_prompt"
                  data-track-target="x"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "secondary" }),
                    "flex-1 justify-center"
                  )}
                >
                  <XLogo />
                  Follow on X
                </a>
                <a
                  href={LINKS.GITHUB}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismiss}
                  data-track="follow_prompt"
                  data-track-target="github"
                  className={cn(
                    buttonVariants({ size: "lg", variant: "secondary" }),
                    "flex-1 justify-center"
                  )}
                >
                  <GithubIcon aria-hidden="true" className="size-4" />
                  Star
                </a>
              </div>
            </div>
          </m.dialog>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
};
