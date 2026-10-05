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
import { TOOLS_EVENT } from "@/lib/tools-events";
import { cn } from "@/lib/utils";

export interface ToolCategory {
  count: number;
  label: string;
  value: string;
}

interface ToolsToolbarProps {
  categories: ToolCategory[];
  className?: string;
}

const detailOf = <T,>(event: Event) => (event as CustomEvent<T>).detail;

export const ToolsToolbar = ({ categories, className }: ToolsToolbarProps) => {
  const [category, setCategory] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map(({ count, value }) => [value, count]))
  );
  const [view, setView] = useState("grid");

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

      <Tabs value={view} onValueChange={(value) => selectView(String(value))}>
        <TabsList>
          <TabsTrigger
            value="list"
            aria-label="List view"
            title="List view"
            className="px-2"
          >
            <ListIcon className="size-4" />
          </TabsTrigger>
          <TabsTrigger
            value="grid"
            aria-label="Grid view"
            title="Grid view"
            className="px-2"
          >
            <LayoutGridIcon className="size-4" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
