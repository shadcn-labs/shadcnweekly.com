import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Rolling digit reels modeled on number-flow (github.com/barvian/number-flow):
// each box holds a vertical reel of numerals moved with translateY, eased by
// number-flow's spring curve, with masked top/bottom edges.

const REEL = [..."01234567890123456789"];
const STEP = 100 / REEL.length;
const DURATION_MS = 1400;
const STAGGER_MS = 90;
// number-flow's default transformTiming easing (a spring sampled into linear()).
const SPRING_EASING =
  "linear(0,.005,.019,.039,.066,.096,.129,.165,.202,.24,.278,.316,.354,.39,.426,.461,.494,.526,.557,.586,.614,.64,.665,.689,.711,.731,.751,.769,.786,.802,.817,.831,.844,.856,.867,.877,.887,.896,.904,.912,.919,.925,.931,.937,.942,.947,.951,.955,.959,.962,.965,.968,.971,.973,.976,.978,.98,.981,.983,.984,.986,.987,.988,.989,.99,.991,.992,.992,.993,.994,.994,.995,.995,.996,.996,.9963,.9967,.9969,.9972,.9975,.9977,.9979,.9981,.9982,.9984,.9985,.9987,.9988,.9989,1)";

// Final reel position: one full lap past 0, landing on the digit, so every
// box (zeros included) rolls upward from 0.
const reelOffset = (digit: string) =>
  `translateY(-${(10 + Number(digit)) * STEP}%)`;

interface FlipNumberProps {
  value: number;
  className?: string;
}

export const FlipNumber = ({ value, className }: FlipNumberProps) => {
  const target = String(value);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (
      !root ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const easing = CSS.supports("transition-timing-function", SPRING_EASING)
      ? SPRING_EASING
      : "cubic-bezier(0.2, 0.8, 0.3, 1)";
    const reels = [...root.querySelectorAll<HTMLElement>("[data-reel]")];

    const roll = () => {
      for (const [index, reel] of reels.entries()) {
        for (const animation of reel.getAnimations()) {
          animation.cancel();
        }
        const cell = reel.parentElement;
        if (!cell) {
          continue;
        }
        cell.dataset.spinning = "";
        const animation = reel.animate(
          { transform: ["translateY(0)", reelOffset(target[index])] },
          {
            delay: index * STAGGER_MS,
            duration: DURATION_MS,
            easing,
            fill: "backwards",
          }
        );
        // Hand back to the static digit at rest so it sits on whole pixels.
        animation.onfinish = () => {
          delete cell.dataset.spinning;
        };
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          roll();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(root);

    return () => {
      observer.disconnect();
    };
  }, [target]);

  return (
    <span
      ref={rootRef}
      aria-hidden="true"
      className={cn(
        "inline-flex items-stretch divide-x divide-border overflow-hidden rounded-[0.25em] border border-border bg-background align-[0.08em] shadow-xs",
        className
      )}
    >
      {[...target].map((digit, index) => (
        <span
          // oxlint-disable-next-line react/no-array-index-key -- digit positions are stable
          key={index}
          className="group relative inline-flex w-[1.2em] justify-center overflow-hidden text-[0.8em] leading-none font-medium tabular-nums [mask-image:linear-gradient(to_bottom,transparent,#000_0.2em,#000_calc(100%-0.2em),transparent)]"
        >
          <span className="py-[0.18em] group-data-spinning:invisible">
            {digit}
          </span>
          <span
            data-reel
            className="absolute inset-x-0 top-0 hidden flex-col items-center group-data-spinning:flex"
          >
            {REEL.map((numeral, reelIndex) => (
              // oxlint-disable-next-line react/no-array-index-key -- the reel is a fixed sequence
              <span key={reelIndex} className="py-[0.18em]">
                {numeral}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
};
