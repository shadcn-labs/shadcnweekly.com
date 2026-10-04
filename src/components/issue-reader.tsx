"use client";

import {
  PauseIcon,
  PlayIcon,
  SparklesIcon,
  SquareIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from "motion/react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IssueSection {
  depth: number;
  id: string;
  label: string;
}

interface IssueSummary {
  bullets: string[];
  explainer: string;
  overview: string;
}

interface IssueReaderProps {
  articleId: string;
  sections: IssueSection[];
  summary: IssueSummary;
  title: string;
}

interface TextSegment {
  node: Text;
  nodeStart: number;
  textEnd: number;
  textStart: number;
}

interface SpeechChunk {
  block: HTMLElement;
  segments: TextSegment[];
  text: string;
}

interface ReaderMetrics {
  activeId: string | undefined;
  progress: number;
  readMinutes: number;
}

interface SpeechSessionOptions {
  chunks: SpeechChunk[];
  isCurrent: () => boolean;
  onFinish: () => void;
}

type Panel = "summary" | "toc" | null;
type SpeechStatus = "idle" | "paused" | "playing";
type SummaryMode = "bullets" | "explainer" | "overview";

const ACTIVE_HIGHLIGHT = "issue-spoken-word";
const ACTIVE_BLOCK_CLASS = "issue-reader-block-active";
const READER_OFFSET = 144;
const BAR_HEIGHT = 52;
const BAR_WIDTH = 368;
const PANEL_WIDTH = 448;
const PANEL_TRANSITION = {
  bounce: 0.08,
  duration: 0.32,
  type: "spring",
} as const;
const FADE_TRANSITION = {
  duration: 0.18,
  ease: [0.23, 1, 0.32, 1],
} as const;
const ENTER_TRANSITION = { ...FADE_TRANSITION, delay: 0.04, duration: 0.2 };
const EXIT_TRANSITION = { ...FADE_TRANSITION, duration: 0.12 };
const SUMMARY_MODES = [
  ["overview", "Overview"],
  ["bullets", "Key points"],
  ["explainer", "Explain simply"],
] as const;

const ignoredReaderSelector = [
  ".not-typeset",
  "[data-reader-ignore]",
  "[aria-hidden='true']",
  "button",
  "input",
  "pre",
  "script",
  "select",
  "style",
  "svg",
  "textarea",
].join(",");

const readableBlockSelector =
  "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const findById = (id: string) =>
  document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);

const buildSpeechChunks = (root: HTMLElement): SpeechChunk[] => {
  const grouped = new Map<HTMLElement, SpeechChunk>();
  const chunks: SpeechChunk[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let currentNode = walker.nextNode();
  while (currentNode) {
    const node = currentNode as Text;
    const parent = node.parentElement;
    const rawText = node.data;
    const cleanText = rawText.trim();

    if (parent && cleanText && !parent.closest(ignoredReaderSelector)) {
      const block = parent.closest<HTMLElement>(readableBlockSelector);

      if (block && root.contains(block)) {
        let chunk = grouped.get(block);
        if (!chunk) {
          chunk = { block, segments: [], text: "" };
          grouped.set(block, chunk);
          chunks.push(chunk);
        }

        const nodeStart = rawText.search(/\S/u);
        if (chunk.text) {
          chunk.text += " ";
        }
        const textStart = chunk.text.length;
        chunk.text += cleanText;
        chunk.segments.push({
          node,
          nodeStart,
          textEnd: chunk.text.length,
          textStart,
        });
      }
    }

    currentNode = walker.nextNode();
  }

  return chunks.filter(({ text }) => text.length > 0);
};

const removeActiveHighlight = () => {
  if ("highlights" in CSS) {
    CSS.highlights.delete(ACTIVE_HIGHLIGHT);
  }
  const activeBlocks = document.querySelectorAll(`.${ACTIVE_BLOCK_CLASS}`);
  for (const element of activeBlocks) {
    element.classList.remove(ACTIVE_BLOCK_CLASS);
  }
};

const showBlockHighlight = (block: HTMLElement) => {
  removeActiveHighlight();
  block.classList.add(ACTIVE_BLOCK_CLASS);
};

const getWordRange = (text: string, index: number, length: number) => {
  let start = clamp(index, 0, text.length);
  while (start < text.length && /\s/u.test(text[start] ?? "")) {
    start += 1;
  }

  let end = length > 0 ? start + length : start;
  while (end < text.length && !/\s/u.test(text[end] ?? "")) {
    end += 1;
  }

  return { end: clamp(end, start, text.length), start };
};

const showBoundaryHighlight = (
  chunk: SpeechChunk,
  index: number,
  length: number
) => {
  removeActiveHighlight();
  const word = getWordRange(chunk.text, index, length);

  if ("highlights" in CSS && "Highlight" in window) {
    const ranges = chunk.segments.flatMap((segment) => {
      const start = Math.max(word.start, segment.textStart);
      const end = Math.min(word.end, segment.textEnd);
      if (start >= end) {
        return [];
      }

      const range = new Range();
      range.setStart(
        segment.node,
        segment.nodeStart + (start - segment.textStart)
      );
      range.setEnd(segment.node, segment.nodeStart + (end - segment.textStart));
      return [range];
    });

    if (ranges.length > 0) {
      CSS.highlights.set(ACTIVE_HIGHLIGHT, new Highlight(...ranges));
      return;
    }
  }

  chunk.block.classList.add(ACTIVE_BLOCK_CLASS);
};

const startSpeechSession = ({
  chunks,
  isCurrent,
  onFinish,
}: SpeechSessionOptions) => {
  let index = 0;

  const speakNext = () => {
    if (!isCurrent()) {
      return;
    }

    const chunk = chunks[index];
    if (!chunk) {
      onFinish();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.lang = document.documentElement.lang || "en-US";
    utterance.rate = 1;
    utterance.addEventListener("start", () => {
      showBlockHighlight(chunk.block);
    });
    utterance.addEventListener("boundary", (event) => {
      if (isCurrent()) {
        showBoundaryHighlight(chunk, event.charIndex, event.charLength);
      }
    });
    utterance.addEventListener("end", () => {
      if (isCurrent()) {
        index += 1;
        speakNext();
      }
    });
    utterance.addEventListener("error", (event) => {
      const expected =
        event.error === "canceled" || event.error === "interrupted";
      if (isCurrent() && !expected) {
        onFinish();
      }
    });

    window.speechSynthesis.speak(utterance);
  };

  speakNext();
};

const getReadMinutes = (chunks: SpeechChunk[]) => {
  const words = chunks
    .map(({ text }) => text)
    .join(" ")
    .trim()
    .split(/\s+/u).length;
  return Math.max(1, Math.ceil(words / 180));
};

const useReaderMetrics = (articleId: string, sections: IssueSection[]) => {
  const [metrics, setMetrics] = React.useState<ReaderMetrics>({
    activeId: sections[0]?.id,
    progress: 0,
    readMinutes: 1,
  });

  React.useEffect(() => {
    const article = findById(articleId);
    if (!article) {
      return;
    }

    const readMinutes = getReadMinutes(buildSpeechChunks(article));
    const update = () => {
      const rect = article.getBoundingClientRect();
      const articleTop = window.scrollY + rect.top;
      const articleBottom = window.scrollY + rect.bottom;
      const start = articleTop - READER_OFFSET;
      const end = Math.max(
        start + 1,
        articleBottom - window.innerHeight * 0.55
      );
      const active = sections.findLast(({ id }) => {
        const heading = findById(id);
        return heading
          ? heading.getBoundingClientRect().top <= READER_OFFSET
          : false;
      });

      setMetrics({
        activeId: active?.id ?? sections[0]?.id,
        progress: clamp((window.scrollY - start) / (end - start), 0, 1),
        readMinutes,
      });
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(article);
    // eslint-disable-next-line github/no-useless-passive, github/prefer-observers
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", update);
    };
  }, [articleId, sections]);

  return metrics;
};

const useSpeechReader = (articleId: string) => {
  const sessionRef = React.useRef(0);
  const statusRef = React.useRef<SpeechStatus>("idle");
  const [status, setStatus] = React.useState<SpeechStatus>("idle");
  const [supported, setSupported] = React.useState(true);

  const updateStatus = (nextStatus: SpeechStatus) => {
    statusRef.current = nextStatus;
    setStatus(nextStatus);
  };

  const finish = () => {
    removeActiveHighlight();
    updateStatus("idle");
  };

  const stop = () => {
    sessionRef.current += 1;
    window.speechSynthesis?.cancel();
    finish();
  };

  const toggle = () => {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      setSupported(false);
      return;
    }

    if (statusRef.current === "playing") {
      window.speechSynthesis.pause();
      updateStatus("paused");
      return;
    }

    if (statusRef.current === "paused") {
      window.speechSynthesis.resume();
      updateStatus("playing");
      return;
    }

    const article = findById(articleId);
    if (!article) {
      return;
    }

    const chunks = buildSpeechChunks(article);
    if (chunks.length === 0) {
      return;
    }

    window.speechSynthesis.cancel();
    sessionRef.current += 1;
    const session = sessionRef.current;
    updateStatus("playing");
    startSpeechSession({
      chunks,
      isCurrent: () => session === sessionRef.current,
      onFinish: finish,
    });
  };

  React.useEffect(
    () => () => {
      sessionRef.current += 1;
      window.speechSynthesis?.cancel();
      removeActiveHighlight();
    },
    []
  );

  return { status, stop, supported, toggle };
};

const useElementHeight = () => {
  const [node, setNode] = React.useState<HTMLElement | null>(null);
  const [height, setHeight] = React.useState(0);

  React.useEffect(() => {
    if (!node) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setHeight(entry?.borderBoxSize[0]?.blockSize ?? node.offsetHeight);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, height] as const;
};

const PANEL_MOTION = {
  animate: { filter: "blur(0px)", opacity: 1, y: 0 },
  exit: { filter: "blur(2px)", opacity: 0, transition: EXIT_TRANSITION, y: 4 },
  initial: { filter: "blur(2px)", opacity: 0, y: 4 },
  transition: ENTER_TRANSITION,
};
const PANEL_MOTION_REDUCED = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
  transition: { duration: 0 },
};

const PANEL_CLASS = "flex max-h-[min(22rem,calc(100dvh-9rem))] flex-col";
const PANEL_HEADER_CLASS =
  "flex shrink-0 items-center justify-between pt-2 pr-2 pb-1 pl-5";

interface TocPanelProps {
  activeId: string | undefined;
  onClose: () => void;
  onSelect: (id: string) => void;
  reduceMotion: boolean | null;
  sections: IssueSection[];
}

const TocPanel = ({
  activeId,
  onClose,
  onSelect,
  reduceMotion,
  sections,
}: TocPanelProps) => (
  <m.div
    className={PANEL_CLASS}
    {...(reduceMotion ? PANEL_MOTION_REDUCED : PANEL_MOTION)}
  >
    <div className={PANEL_HEADER_CLASS}>
      <div>
        <p className="text-sm font-semibold">In this issue</p>
        <p className="text-xs text-muted-foreground">Jump to a section</p>
      </div>
      <Button
        aria-label="Close table of contents"
        className="text-muted-foreground hover:text-foreground"
        onClick={onClose}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-4" />
      </Button>
    </div>
    <ul className="min-h-0 flex-auto overflow-y-auto overscroll-contain px-2 pb-2">
      {sections.map((section) => {
        const isActive = activeId === section.id;
        return (
          <li key={section.id}>
            <Button
              aria-current={isActive ? "location" : undefined}
              className={cn(
                "relative min-h-9 w-full justify-start gap-3 pr-3 text-left text-sm font-normal whitespace-normal",
                section.depth > 2 ? "pl-7" : "pl-3",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              onClick={() => onSelect(section.id)}
              type="button"
              variant="ghost"
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  isActive ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              <span className="line-clamp-1">{section.label}</span>
            </Button>
          </li>
        );
      })}
    </ul>
  </m.div>
);

interface SummaryBodyProps {
  mode: SummaryMode;
  summary: IssueSummary;
}

const SummaryBody = ({ mode, summary }: SummaryBodyProps) => {
  if (mode === "overview") {
    return <p>{summary.overview}</p>;
  }
  if (mode === "explainer") {
    return <p>{summary.explainer}</p>;
  }
  return (
    <ul className="space-y-2">
      {summary.bullets.map((bullet) => (
        <li className="flex gap-2" key={bullet}>
          <span
            aria-hidden="true"
            className="mt-2 size-1 shrink-0 rounded-full bg-foreground"
          />
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
  );
};

interface SummaryPanelProps {
  mode: SummaryMode;
  onClose: () => void;
  onModeChange: (mode: SummaryMode) => void;
  reduceMotion: boolean | null;
  summary: IssueSummary;
}

const SummaryPanel = ({
  mode,
  onClose,
  onModeChange,
  reduceMotion,
  summary,
}: SummaryPanelProps) => (
  <m.div
    className={PANEL_CLASS}
    {...(reduceMotion ? PANEL_MOTION_REDUCED : PANEL_MOTION)}
  >
    <div className={PANEL_HEADER_CLASS}>
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4" />
        <div>
          <p className="text-sm font-semibold">AI summary</p>
          <p className="text-xs text-muted-foreground">
            Choose a reading style
          </p>
        </div>
      </div>
      <Button
        aria-label="Close summary"
        className="text-muted-foreground hover:text-foreground"
        onClick={onClose}
        size="icon-lg"
        type="button"
        variant="ghost"
      >
        <XIcon className="size-4" />
      </Button>
    </div>

    <Tabs
      className="min-h-0 flex-auto gap-0"
      onValueChange={(value) => onModeChange(value as SummaryMode)}
      value={mode}
    >
      <TabsList className="mx-2 grid w-auto shrink-0 grid-cols-3">
        {SUMMARY_MODES.map(([value, label]) => (
          <TabsTrigger key={value} value={value}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {SUMMARY_MODES.map(([value]) => (
        <TabsContent
          className="min-h-0 overflow-y-auto overscroll-contain px-5 py-3 text-sm leading-relaxed text-pretty text-muted-foreground"
          key={value}
          value={value}
        >
          <m.div
            animate={{ opacity: 1, y: 0 }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
            transition={reduceMotion ? { duration: 0 } : FADE_TRANSITION}
          >
            <SummaryBody mode={value} summary={summary} />
          </m.div>
        </TabsContent>
      ))}
    </Tabs>
    <p className="shrink-0 px-5 pb-3 text-xs text-muted-foreground/60">
      AI-generated from this issue. Check the linked sources for full context.
    </p>
  </m.div>
);

const getAudioLabel = (status: SpeechStatus, readMinutes: number) => {
  if (status === "playing") {
    return "Pause article";
  }
  if (status === "paused") {
    return "Resume article";
  }
  return `Listen to article, about ${readMinutes} minutes`;
};

const getAudioTooltip = (status: SpeechStatus, readMinutes: number) => {
  if (status === "playing") {
    return "Pause";
  }
  if (status === "paused") {
    return "Resume";
  }
  return `Listen · ${readMinutes} min`;
};

const BarTooltip = ({
  children,
  label,
}: {
  children: React.ReactElement;
  label: string;
}) => (
  <Tooltip>
    <TooltipTrigger render={children} />
    <TooltipContent side="top" sideOffset={8}>
      {label}
    </TooltipContent>
  </Tooltip>
);

const getSpeechAnnouncement = (status: SpeechStatus) => {
  if (status === "playing") {
    return "Reading article";
  }
  if (status === "paused") {
    return "Article paused";
  }
  return "Article reader stopped";
};

interface ReaderControlsProps {
  activeId: string | undefined;
  activeLabel: string;
  onStop: () => void;
  onSummaryToggle: () => void;
  onTocToggle: () => void;
  onToggleSpeech: () => void;
  panel: Panel;
  progress: number;
  readMinutes: number;
  reduceMotion: boolean | null;
  speechStatus: SpeechStatus;
  speechSupported: boolean;
}

const ReaderControls = ({
  activeId,
  activeLabel,
  onStop,
  onSummaryToggle,
  onTocToggle,
  onToggleSpeech,
  panel,
  progress,
  readMinutes,
  reduceMotion,
  speechStatus,
  speechSupported,
}: ReaderControlsProps) => {
  const audioLabel = getAudioLabel(speechStatus, readMinutes);
  let AudioIcon = Volume2Icon;
  if (speechStatus === "playing") {
    AudioIcon = PauseIcon;
  } else if (speechStatus === "paused") {
    AudioIcon = PlayIcon;
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-[50px] shrink-0 items-center px-[7px]",
          panel ? "shadow-[inset_0_1px_0_var(--color-border)]" : undefined
        )}
      >
        <BarTooltip
          label={panel === "toc" ? "Hide contents" : "Table of contents"}
        >
          <Button
            aria-expanded={panel === "toc"}
            aria-label="Show table of contents"
            className="h-9 min-w-0 flex-1 justify-start gap-2.5 pr-3 pl-1 text-left"
            onClick={onTocToggle}
            type="button"
            variant="ghost"
          >
            <svg
              aria-hidden="true"
              className="size-7 shrink-0 -rotate-90"
              viewBox="0 0 28 28"
            >
              <circle
                className="stroke-border"
                cx="14"
                cy="14"
                fill="none"
                r="11"
                strokeWidth="2.5"
              />
              <m.circle
                animate={{ pathLength: progress }}
                className="stroke-primary"
                cx="14"
                cy="14"
                fill="none"
                initial={false}
                r="11"
                strokeLinecap="round"
                strokeWidth="2.5"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : {
                        damping: 30,
                        mass: 0.25,
                        stiffness: 140,
                        type: "spring",
                      }
                }
              />
            </svg>
            <span className="relative min-w-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} mode="popLayout">
                <m.span
                  key={activeId ?? "issue"}
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  className="block truncate text-sm font-medium"
                  exit={{ filter: "blur(2px)", opacity: 0 }}
                  initial={
                    reduceMotion
                      ? { opacity: 0 }
                      : { filter: "blur(2px)", opacity: 0 }
                  }
                  transition={reduceMotion ? { duration: 0 } : FADE_TRANSITION}
                >
                  {activeLabel}
                </m.span>
              </AnimatePresence>
            </span>
          </Button>
        </BarTooltip>

        <span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />

        <BarTooltip label={getAudioTooltip(speechStatus, readMinutes)}>
          <Button
            aria-label={audioLabel}
            className="text-muted-foreground hover:text-foreground disabled:cursor-not-allowed"
            disabled={!speechSupported}
            onClick={onToggleSpeech}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <AudioIcon className="size-4" />
          </Button>
        </BarTooltip>

        <AnimatePresence initial={false}>
          {speechStatus === "idle" ? null : (
            <m.div
              animate={{ opacity: 1, scale: 1 }}
              className="shrink-0"
              exit={{ opacity: 0, scale: 0.9 }}
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }
              }
              transition={reduceMotion ? { duration: 0 } : FADE_TRANSITION}
            >
              <BarTooltip label="Stop">
                <Button
                  aria-label="Stop reading article"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={onStop}
                  size="icon-lg"
                  type="button"
                  variant="ghost"
                >
                  <SquareIcon className="size-3.5" fill="currentColor" />
                </Button>
              </BarTooltip>
            </m.div>
          )}
        </AnimatePresence>

        <BarTooltip label={panel === "summary" ? "Hide summary" : "AI summary"}>
          <Button
            aria-expanded={panel === "summary"}
            aria-label="Show AI summary"
            className={
              panel === "summary"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }
            onClick={onSummaryToggle}
            size="icon-lg"
            type="button"
            variant="ghost"
          >
            <SparklesIcon className="size-4" />
          </Button>
        </BarTooltip>

        <span aria-live="polite" className="sr-only">
          {getSpeechAnnouncement(speechStatus)}
        </span>
      </div>
    </TooltipProvider>
  );
};

const IssueReaderSurface = ({
  articleId,
  sections,
  summary,
  title,
}: IssueReaderProps) => {
  const reduceMotion = useReducedMotion();
  const rootRef = React.useRef<HTMLElement>(null);
  const [panel, setPanel] = React.useState<Panel>(null);
  const [summaryMode, setSummaryMode] = React.useState<SummaryMode>("overview");
  const metrics = useReaderMetrics(articleId, sections);
  const speech = useSpeechReader(articleId);
  const [setPanelNode, panelHeight] = useElementHeight();
  const activeLabel =
    sections.find(({ id }) => id === metrics.activeId)?.label ??
    sections[0]?.label ??
    title;

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanel(null);
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  const selectSection = (id: string) => {
    setPanel(null);
    findById(id)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };
  const handleStop = () => speech.stop();
  const handleSummaryToggle = () =>
    setPanel((current) => (current === "summary" ? null : "summary"));
  const handleTocToggle = () =>
    setPanel((current) => (current === "toc" ? null : "toc"));
  const handleToggleSpeech = () => speech.toggle();

  return (
    <nav
      ref={rootRef}
      aria-label="Issue reader"
      data-floating-bar
      className="pointer-events-none sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 h-[52px] w-full"
    >
      <style>{`::highlight(${ACTIVE_HIGHLIGHT}) { background-color: color-mix(in oklch, var(--foreground) 16%, transparent); color: inherit; }`}</style>
      <m.div
        animate={{
          height: panel ? panelHeight + BAR_HEIGHT : BAR_HEIGHT,
          width: panel ? PANEL_WIDTH : BAR_WIDTH,
        }}
        className="pointer-events-auto absolute bottom-0 left-1/2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-background/95 text-foreground shadow-lg backdrop-blur-md"
        initial={false}
        transition={reduceMotion ? { duration: 0 } : PANEL_TRANSITION}
      >
        <div className="flex min-h-0 flex-1 items-start justify-center overflow-hidden">
          <div
            className="w-[446px] max-w-[calc(100vw-2rem-2px)] shrink-0"
            ref={setPanelNode}
          >
            <AnimatePresence initial={false} mode="wait">
              {panel === "toc" ? (
                <TocPanel
                  activeId={metrics.activeId}
                  key="toc"
                  onClose={() => setPanel(null)}
                  onSelect={selectSection}
                  reduceMotion={reduceMotion}
                  sections={sections}
                />
              ) : null}
              {panel === "summary" ? (
                <SummaryPanel
                  key="summary"
                  mode={summaryMode}
                  onClose={() => setPanel(null)}
                  onModeChange={setSummaryMode}
                  reduceMotion={reduceMotion}
                  summary={summary}
                />
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <ReaderControls
          activeId={metrics.activeId}
          activeLabel={activeLabel}
          onStop={handleStop}
          onSummaryToggle={handleSummaryToggle}
          onTocToggle={handleTocToggle}
          onToggleSpeech={handleToggleSpeech}
          panel={panel}
          progress={metrics.progress}
          readMinutes={metrics.readMinutes}
          reduceMotion={reduceMotion}
          speechStatus={speech.status}
          speechSupported={speech.supported}
        />
      </m.div>
    </nav>
  );
};

const IssueReader = (props: IssueReaderProps) => (
  <LazyMotion features={domAnimation} strict>
    <IssueReaderSurface {...props} />
  </LazyMotion>
);

export { IssueReader };
