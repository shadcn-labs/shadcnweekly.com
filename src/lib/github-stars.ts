import { LINKS } from "@/constants/links";

const CACHE_MS = 60 * 60 * 1000;
const REPO = new URL(LINKS.GITHUB).pathname.slice(1);

let cached: { at: number; stars: number | null } | undefined;

/**
 * Star count for the site's repository, cached per server instance (and so
 * fetched once per build for prerendered pages). Unauthenticated GitHub API
 * calls are rate limited, so failures resolve to `null` and the count is
 * simply hidden.
 */
export const getGithubStars = async (): Promise<number | null> => {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.stars;
  }
  let stars: number | null = null;
  try {
    const response = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: { Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = (await response.json()) as { stargazers_count?: number };
      stars = data.stargazers_count ?? null;
    }
  } catch {
    // Offline or rate limited: render without a count.
  }
  cached = { at: Date.now(), stars };
  return stars;
};

const compact = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const full = new Intl.NumberFormat("en-US");

/** Navbar count, at most one decimal: 950 → "950", 2449 → "2.4k", 12345 → "12.3k". */
export const formatStars = (stars: number) =>
  compact.format(stars).toLowerCase();

/** Tooltip count: 1 → "1 star", 12345 → "12,345 stars". */
export const formatStarsFull = (stars: number) =>
  `${full.format(stars)} ${stars === 1 ? "star" : "stars"}`;
