import { ChevronDownIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOOLS_EVENT } from "@/lib/tools-events";
import { cn } from "@/lib/utils";

export interface ToolCategory {
  count: number;
  label: string;
  value: string;
}

const VIEWS = [
  { icon: ListIcon, label: "List view", value: "list" },
  { icon: LayoutGridIcon, label: "Grid view", value: "grid" },
] as const;

interface ToolsToolbarProps {
  categories: ToolCategory[];
  className?: string;
  /** Server-rendered state, so the first paint already matches the URL. */
  initialCategory: string;
  initialCounts: Record<string, number>;
  initialView: "grid" | "list";
}

const detailOf = <T,>(event: Event) => (event as CustomEvent<T>).detail;

export const ToolsToolbar = ({
  categories,
  className,
  initialCategory,
  initialCounts,
  initialView,
}: ToolsToolbarProps) => {
  const [category, setCategory] = useState(initialCategory);
  const [counts, setCounts] = useState(initialCounts);
  const [view, setView] = useState<string>(initialView);

  useEffect(() => {
    const onCategory = (event: Event) => setCategory(detailOf<string>(event));
    const onCounts = (event: Event) =>
      setCounts(detailOf<Record<string, number>>(event));
    const onView = (event: Event) => setView(detailOf<string>(event));

    window.addEventListener(TOOLS_EVENT.CATEGORY, onCategory);
    window.addEventListener(TOOLS_EVENT.COUNTS, onCounts);
    window.addEventListener(TOOLS_EVENT.VIEW, onView);
    window.dispatchEvent(new CustomEvent(TOOLS_EVENT.SYNC));

    return () => {
      window.removeEventListener(TOOLS_EVENT.CATEGORY, onCategory);
      window.removeEventListener(TOOLS_EVENT.COUNTS, onCounts);
      window.removeEventListener(TOOLS_EVENT.VIEW, onView);
    };
  }, []);

  const selectCategory = (value: string) => {
    setCategory(value);
    window.dispatchEvent(
      new CustomEvent(TOOLS_EVENT.CATEGORY_SET, { detail: value })
    );
  };

  const selectView = (value: string) => {
    setView(value);
    window.dispatchEvent(
      new CustomEvent(TOOLS_EVENT.VIEW_SET, { detail: value })
    );
  };

  const activeLabel =
    categories.find((item) => item.value === category)?.label ?? "";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors",
            category === ""
              ? "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              : "border-transparent bg-foreground text-background hover:opacity-90"
          )}
        >
          {activeLabel}
          <ChevronDownIcon className="size-3.5 transition-transform group-data-popup-open:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-80 p-2">
          <DropdownMenuRadioGroup
            value={category}
            onValueChange={(value) => selectCategory(String(value))}
          >
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {categories.map((item) => (
                <DropdownMenuRadioItem
                  key={item.value}
                  value={item.value}
                  closeOnClick
                  className="group h-8 justify-between gap-3 pr-2.5 font-normal data-checked:bg-accent data-checked:font-medium [&>[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
                >
                  <span>{item.label}</span>
                  <span className="text-muted-foreground group-data-checked:text-foreground tabular-nums">
                    {counts[item.value] ?? 0}
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* One Tooltip root with two triggers: moving between the tabs moves the
          same popup (its payload swaps) instead of animating a second one. */}
      <TooltipProvider>
        <Tooltip>
          {({ payload }) => (
            <>
              <Tabs
                value={view}
                onValueChange={(value) => selectView(String(value))}
              >
                <TabsList className="h-8 gap-0.5 p-0.5">
                  {VIEWS.map(({ icon: Icon, label, value }) => (
                    <TooltipTrigger
                      key={value}
                      payload={label}
                      render={
                        <TabsTrigger
                          value={value}
                          aria-label={label}
                          className="size-7 flex-none p-0"
                        />
                      }
                    >
                      <Icon className="size-4" />
                    </TooltipTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <TooltipContent>{payload as string}</TooltipContent>
            </>
          )}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
