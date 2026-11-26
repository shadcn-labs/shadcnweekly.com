/** Shared timing/persistence rules for the site-wide follow prompt. */

export const DELAY_MS = 15_000;
export const DISMISSED_KEY = "shadcnweekly:follow-prompt-dismissed";
export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * True when the prompt was dismissed within the last day. Kept pure so the
 * dismissal window is covered by unit tests without a DOM.
 */
export const wasRecentlyDismissed = (
  dismissedAt: number | null | undefined,
  now: number = Date.now()
): boolean =>
  typeof dismissedAt === "number" &&
  Number.isFinite(dismissedAt) &&
  now - dismissedAt < DAY_MS;

/** Reads the stored dismissal timestamp, guarding against storage/SSR throwups. */
export const readDismissedAt = (): number | null => {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw === null) {
      return null;
    }
    const at = Number(raw);
    return Number.isFinite(at) ? at : null;
  } catch {
    return null;
  }
};

/** Remembers a dismissal for a day; safe during SSR and private browsing. */
export const rememberDismissal = (): void => {
  try {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  } catch {
    // Storage can be unavailable; the prompt still closes for this visit.
  }
};
