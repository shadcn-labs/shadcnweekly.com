/**
 * HTTP `Accept` negotiation for the two representations this site serves.
 *
 * Implements RFC 9110 content negotiation (q-values, wildcards, explicit
 * rejections) so a request for `text/markdown` can be answered with Markdown
 * while browsers keep receiving HTML from the same URL.
 *
 * Keep this module free of Astro imports: it is covered by `node --test`.
 */
export const HTML = "text/html";
export const MARKDOWN = "text/markdown";

const PRODUCES = [HTML, MARKDOWN] as const;

interface AcceptEntry {
  position: number;
  q: number;
  specificity: number;
  type: string;
}

interface MatchQuality {
  position: number;
  q: number;
  specificity: number;
}

const specificityOf = (type: string): number => {
  if (type === "*/*") {
    return 0;
  }
  if (type.endsWith("/*")) {
    return 1;
  }
  return 2;
};

const parseAccept = (header: string): AcceptEntry[] =>
  header
    .split(",")
    .map((raw, position) => {
      const [type = "", ...params] = raw
        .trim()
        .split(";")
        .map((part) => part.trim());
      let q = 1;

      for (const param of params) {
        const [name, value] = param.split("=").map((part) => part.trim());
        if (name?.toLowerCase() === "q") {
          const parsed = Number(value);
          if (!Number.isNaN(parsed)) {
            q = Math.max(0, Math.min(1, parsed));
          }
        }
      }

      return {
        position,
        q,
        specificity: specificityOf(type),
        type: type.toLowerCase(),
      };
    })
    .filter((entry) => entry.type.length > 0);

const matches = (entry: AcceptEntry, candidate: string): boolean => {
  if (entry.type === "*/*") {
    return true;
  }
  if (entry.type.endsWith("/*")) {
    return candidate.startsWith(entry.type.slice(0, -1));
  }
  return entry.type === candidate;
};

const mostSpecificMatch = (
  entries: AcceptEntry[],
  candidate: string
): AcceptEntry | null => {
  let matched: AcceptEntry | null = null;

  for (const entry of entries) {
    if (!matches(entry, candidate)) {
      continue;
    }
    if (
      matched === null ||
      entry.specificity > matched.specificity ||
      (entry.specificity === matched.specificity &&
        entry.position < matched.position)
    ) {
      matched = entry;
    }
  }

  return matched;
};

// Highest q wins; on ties the more specific match wins; remaining ties go to
// the earliest header position, so `text/markdown, text/html, */*` selects
// Markdown while `text/html, text/markdown` selects HTML.
const isBetterMatch = (
  candidate: MatchQuality,
  best: MatchQuality
): boolean => {
  if (candidate.q !== best.q) {
    return candidate.q > best.q;
  }
  if (candidate.specificity !== best.specificity) {
    return candidate.specificity > best.specificity;
  }
  return candidate.position < best.position;
};

/**
 * Returns the representation to serve for an `Accept` header, or `null` when
 * the client explicitly rejected every representation we produce.
 */
export const preferredType = (header: string | null): string | null => {
  if (!header) {
    return HTML;
  }

  const entries = parseAccept(header);
  if (entries.length === 0) {
    return HTML;
  }

  let best: string | null = null;
  let bestQuality: MatchQuality | null = null;

  for (const candidate of PRODUCES) {
    // The most specific matching range wins for a candidate, regardless of q,
    // so `text/html;q=0, */*;q=1` rejects HTML instead of letting `*/*` win.
    const matched = mostSpecificMatch(entries, candidate);
    if (matched === null || matched.q <= 0) {
      continue;
    }

    const quality: MatchQuality = {
      position: matched.position,
      q: matched.q,
      specificity: matched.specificity,
    };

    if (bestQuality === null || isBetterMatch(quality, bestQuality)) {
      best = candidate;
      bestQuality = quality;
    }
  }

  return best;
};

export const prefersMarkdown = (header: string | null): boolean =>
  preferredType(header) === MARKDOWN;

/** Adds a token to `Vary` without duplicating an existing one. */
const appendVary = (headers: Headers, token: string): void => {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", token);
    return;
  }

  const tokens = existing.split(",").map((value) => value.trim().toLowerCase());
  if (!tokens.includes(token.toLowerCase())) {
    headers.set("Vary", `${existing}, ${token}`);
  }
};

/** Adds `Accept` to `Vary` without duplicating an existing token. */
export const appendVaryAccept = (headers: Headers): void => {
  appendVary(headers, "Accept");
};

/**
 * Adds `User-Agent` to `Vary` without duplicating an existing token. Bot
 * detection serves Markdown based on the User-Agent, so shared caches must key
 * on it as well as Accept.
 */
export const appendVaryUserAgent = (headers: Headers): void => {
  appendVary(headers, "User-Agent");
};
