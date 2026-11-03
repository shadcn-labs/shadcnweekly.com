// Dependency-free URL helpers, shared by the draft pipeline and by
// review.ts, which CI runs without installing packages.

const TRACKING_PARAM = /^(?:utm_|ref$|ref_src$|s$|t$|si$|fbclid$|gclid$)/u;

const dropTracking = (url: URL) => {
  url.search = new URLSearchParams(
    [...url.searchParams].filter(([key]) => !TRACKING_PARAM.test(key))
  ).toString();
};

export const normalizeUrl = (raw: string): string => {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^(?:www|mobile)\./u, "");
    if (url.hostname === "twitter.com") {
      url.hostname = "x.com";
    }
    dropTracking(url);
    const path = url.pathname.replace(/\/+$/u, "");
    return `${url.protocol}//${url.hostname}${path}${url.search}`;
  } catch {
    return raw.trim();
  }
};

export const withoutTracking = (raw: string) => {
  try {
    const url = new URL(raw);
    dropTracking(url);
    return url.href;
  } catch {
    return raw;
  }
};

export const hostOf = (raw: string) => {
  try {
    return new URL(raw).hostname
      .toLowerCase()
      .replace(/^(?:www|mobile|m|old)\./u, "");
  } catch {
    return "";
  }
};

// Posts, reposts and listings *about* a project. Fine as a source, wrong as the
// destination of a project link or a tools directory entry.
const INDIRECT_HOSTS = [
  "alternativeto.net",
  "allshadcn.com",
  "bsky.app",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "mcp.directory",
  "news.ycombinator.com",
  "opensourcealternatives.to",
  "producthunt.com",
  "reddit.com",
  "registry.directory",
  "shadcn.io",
  "threads.com",
  "threads.net",
  "tiktok.com",
  "twitter.com",
  "vimeo.com",
  "x.com",
  "youtu.be",
  "youtube.com",
];

export const isIndirectUrl = (raw: string) => {
  const host = hostOf(raw);
  return INDIRECT_HOSTS.some(
    (indirect) => host === indirect || host.endsWith(`.${indirect}`)
  );
};

// Social CDNs and signed URLs (`oe=`, `X-Amz-Expires=`, Discord `ex`/`is`/`hm`)
// stop loading within days.
const UNSTABLE_IMAGE_HOST =
  /(?:^|\.)(?:cdninstagram\.com|fbcdn\.net|twimg\.com)$/u;
const SIGNED_IMAGE_PARAM =
  /^(?:ex|expires|hm|is|oe|oh|se|sig|signature|x-amz-expires|x-amz-signature|x-goog-expires|x-goog-signature)$/iu;

export const isStableImageUrl = (raw: string) => {
  try {
    const url = new URL(raw);
    return (
      !UNSTABLE_IMAGE_HOST.test(url.hostname) &&
      ![...url.searchParams.keys()].some((key) => SIGNED_IMAGE_PARAM.test(key))
    );
  } catch {
    return false;
  }
};

// "owner/repo" for any GitHub URL inside a repository, else undefined.
export const githubRepo = (raw: string) => {
  if (hostOf(raw) !== "github.com") {
    return;
  }
  const [owner, repo] = new URL(raw).pathname.split("/").filter(Boolean);
  return owner && repo ? `${owner}/${repo}`.toLowerCase() : undefined;
};

const compact = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/[^a-z0-9]+/gu, "");

// Whether a URL names the project, e.g. github.com/shadcn-labs/pdfcn for
// "pdfcn". Names under 3 characters match too much to be evidence.
export const namesProject = (url: string, name: string) => {
  const key = compact(name);
  return key.length >= 3 && compact(url).includes(key);
};
