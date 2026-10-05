import { LINKS } from "@/constants/links";

const CACHE_MS = 60 * 60 * 1000;
const REPO = new URL(LINKS.GITHUB).pathname.slice(1);

let cached: { at: number; stars: number | null } | undefined;

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
    void 0;
  }
  cached = { at: Date.now(), stars };
  return stars;
};

const compact = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  notation: "compact",
});
const full = new Intl.NumberFormat("en-US");

export const formatStars = (stars: number) =>
  compact.format(stars).toLowerCase();

export const formatStarsFull = (stars: number) =>
  `${full.format(stars)} ${stars === 1 ? "star" : "stars"}`;
