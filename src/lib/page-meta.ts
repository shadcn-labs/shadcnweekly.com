export interface PageMeta {
  description: string;
  image?: string;
  logo?: string;
  title: string;
}

const META_TIMEOUT_MS = 8000;

const decodeEntities = (value: string) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll(/&#(?<code>\d+);/gu, (...args) => {
      const groups = args.at(-1) as { code?: string };
      return String.fromCodePoint(Number(groups.code));
    })
    .replaceAll(/&#x(?<code>[0-9a-f]+);/giu, (...args) => {
      const groups = args.at(-1) as { code?: string };
      return String.fromCodePoint(Number.parseInt(groups.code ?? "0", 16));
    });

const getMetaContent = (html: string, key: string) => {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["'](?<content>[^"']+)["']`,
      "iu"
    ),
    new RegExp(
      `<meta[^>]+content=["'](?<content>[^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "iu"
    ),
  ];

  const content = patterns
    .map((pattern) => html.match(pattern)?.groups?.content)
    .find(Boolean);

  return content ? decodeEntities(content).trim() : undefined;
};

const getLinkHref = (html: string, rel: string) => {
  const patterns = [
    new RegExp(
      `<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["'](?<href>[^"']+)["']`,
      "iu"
    ),
    new RegExp(
      `<link[^>]+href=["'](?<href>[^"']+)["'][^>]+rel=["'][^"']*${rel}[^"']*["']`,
      "iu"
    ),
  ];

  const href = patterns
    .map((pattern) => html.match(pattern)?.groups?.href)
    .find(Boolean);

  return href ? decodeEntities(href).trim() : undefined;
};

const absoluteUrl = (value: string | undefined, base: string) => {
  let resolved: string | undefined;

  if (value) {
    try {
      resolved = new URL(value, base).href;
    } catch {
      // Invalid URL — leave unresolved
    }
  }

  return resolved;
};

const emptyMeta = (url: string): PageMeta => {
  let title = url;

  try {
    title = new URL(url).hostname.replace(/^www\./u, "");
  } catch {
    // keep url as title
  }

  return {
    description: "",
    logo: absoluteUrl("/favicon.svg", url),
    title,
  };
};

export const fetchPageMeta = async (url: string): Promise<PageMeta> => {
  const fallback = emptyMeta(url);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ShadcnWeeklyBot/1.0 (+https://shadcnweekly.com)",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(META_TIMEOUT_MS),
    });

    if (!response.ok) {
      return fallback;
    }

    const html = await response.text();
    const base = response.url || url;

    const titleMatch = html.match(/<title[^>]*>(?<title>[^<]+)<\/title>/iu);
    const title =
      getMetaContent(html, "og:title") ??
      getMetaContent(html, "twitter:title") ??
      titleMatch?.groups?.title?.trim();

    const description =
      getMetaContent(html, "og:description") ??
      getMetaContent(html, "twitter:description") ??
      getMetaContent(html, "description") ??
      "";

    const image =
      getMetaContent(html, "og:image") ??
      getMetaContent(html, "twitter:image") ??
      getMetaContent(html, "twitter:image:src");

    const logo =
      getLinkHref(html, "apple-touch-icon") ??
      getLinkHref(html, "shortcut icon") ??
      getLinkHref(html, "icon") ??
      "/favicon.ico";

    return {
      description: description ? decodeEntities(description) : "",
      image: absoluteUrl(image, base),
      logo: absoluteUrl(logo, base) ?? fallback.logo,
      title: title ? decodeEntities(title) : fallback.title,
    };
  } catch {
    return fallback;
  }
};
