import {
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  ChatGptIcon,
  ClaudeIcon,
  CursorIcon,
  GithubIcon,
} from "@/components/icons";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

interface IssueCopyPageProps {
  githubUrl: string;
  markdownUrl: string;
  pageUrl: string;
}

// Modeled on DocsCopyPage in the sibling ogimagecn/pdfcn repos.
const promptUrl = (base: string, pageUrl: string, param = "q") =>
  `${base}?${param}=${encodeURIComponent(
    `I'm reading this ${SITE.NAME} issue: ${pageUrl}\nSummarize it and help me explore the links it covers.`
  )}`;

export const IssueCopyPage = ({
  githubUrl,
  markdownUrl,
  pageUrl,
}: IssueCopyPageProps) => {
  const [copied, setCopied] = useState(false);

  const copyPage = async () => {
    try {
      // Hand the clipboard a pending blob so the write starts inside the click
      // gesture; awaiting fetch first loses user activation (notably Safari).
      const markdown = (async () => {
        const response = await fetch(markdownUrl);
        return new Blob([await response.text()], { type: "text/plain" });
      })();
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": markdown }),
      ]);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the page");
    }
  };

  const items = [
    { href: markdownUrl, icon: FileTextIcon, label: "View as Markdown" },
    { href: githubUrl, icon: GithubIcon, label: "Open in GitHub" },
    {
      href: promptUrl("https://chatgpt.com", pageUrl),
      icon: ChatGptIcon,
      label: "Open in ChatGPT",
    },
    {
      href: promptUrl("https://claude.ai/new", pageUrl),
      icon: ClaudeIcon,
      label: "Open in Claude",
    },
    {
      href: promptUrl("https://cursor.com/link/prompt", pageUrl, "text"),
      icon: CursorIcon,
      label: "Open in Cursor",
    },
  ];

  return (
    <div className="inline-flex items-center rounded-lg border border-border bg-background p-0.5 text-muted-foreground transition-colors has-hover:border-foreground/20">
      <button
        type="button"
        onClick={copyPage}
        className={cn(
          buttonVariants({ size: "sm", variant: "ghost" }),
          "pl-2.5 font-medium hover:text-foreground [&_svg:not([class*='size-'])]:size-3.5"
        )}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        Copy page
      </button>
      <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More page actions"
          className={cn(
            buttonVariants({ size: "icon-sm", variant: "ghost" }),
            "hover:text-foreground aria-expanded:text-foreground"
          )}
        >
          <ChevronDownIcon className="size-3.5 transition-transform in-data-popup-open:rotate-180" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {items.map(({ href, icon: Icon, label }, index) => (
            <div key={label} className="contents">
              {index === 2 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLinkItem
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 [&_svg]:text-muted-foreground"
              >
                <Icon />
                {label}
              </DropdownMenuLinkItem>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
