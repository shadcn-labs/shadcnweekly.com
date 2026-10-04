import { buttonVariants } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHotkey } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";

const HOTKEY = "d";

/** Flips the root `dark` class and remembers the choice (see layouts/main.astro). */
const toggleTheme = () => {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
};

interface ThemeToggleProps {
  /** 36px button with a size-5 icon (mobile menu). */
  large?: boolean;
  /**
   * Register the D shortcut. Enable on exactly one instance: two listeners
   * would toggle twice per keypress and cancel out.
   */
  hotkey?: boolean;
}

/**
 * Light/dark toggle. The half-filled icon turns 180° via the `dark:` variant,
 * so it animates on every toggle and is correct on first paint without any
 * React state.
 */
export const ThemeToggle = ({
  large = false,
  hotkey = false,
}: ThemeToggleProps) => {
  useHotkey(HOTKEY, toggleTheme, { enabled: hotkey });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              aria-label="Toggle theme"
              aria-keyshortcuts={HOTKEY.toUpperCase()}
              className={buttonVariants({
                size: large ? "icon-lg" : "icon",
                variant: "ghost",
              })}
            />
          }
          onClick={toggleTheme}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            aria-hidden="true"
            className={cn(
              "transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none dark:rotate-180",
              large ? "size-5" : "size-[18px]"
            )}
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
          </svg>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Toggle theme <Kbd>{HOTKEY.toUpperCase()}</Kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
