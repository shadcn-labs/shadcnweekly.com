import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type { CSSProperties, ComponentProps } from "react";
import { useSyncExternalStore } from "react";
import { Toaster as Sonner } from "sonner";

const subscribeToThemeClass = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["class"],
    attributes: true,
  });
  return () => observer.disconnect();
};

const useClassTheme = () =>
  useSyncExternalStore(
    subscribeToThemeClass,
    () =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    () => "light" as const
  );

export const Toaster = (props: ComponentProps<typeof Sonner>) => {
  const theme = useClassTheme();

  return (
    <Sonner
      theme={theme}
      icons={{
        error: <OctagonXIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
        success: <CircleCheckIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
      }}
      style={
        {
          "--border-radius": "var(--radius)",
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as CSSProperties
      }
      {...props}
    />
  );
};
