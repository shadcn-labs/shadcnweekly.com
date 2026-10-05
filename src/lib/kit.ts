import { getCollection } from "astro:content";

const KIT_API = "https://api.kit.com/v4";
const CACHE_MS = 30 * 60 * 1000;

interface SubscriberCountResponse {
  pagination?: { total_count?: number };
  total_count?: number;
}

/** GET /v4/account/email_stats — rates are percentages over the last 90 days. */
interface EmailStatsResponse {
  stats?: {
    click_rate?: number;
    click_tracking_enabled?: boolean;
    open_rate?: number;
    open_tracking_enabled?: boolean;
  };
}

export interface AudienceStats {
  /** Average click rate (percent, last 90 days); null when click tracking is off. */
  clickRate: number | null;
  /** Average open rate (percent, last 90 days); null when open tracking is off. */
  openRate: number | null;
  subscribers: number | null;
}

/** Fetches a Kit v4 endpoint; returns null without an API key or on any failure. */
const kitGet = async <T>(path: string): Promise<T | null> => {
  const apiKey = import.meta.env.KIT_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    const response = await fetch(`${KIT_API}${path}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey as string,
      },
      signal: AbortSignal.timeout(3000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
};

/** Memoizes an async loader in memory for CACHE_MS (including null results). */
const cachedLoader = <T>(load: () => Promise<T>) => {
  let cached: { at: number; value: T } | undefined;
  return async (): Promise<T> => {
    if (cached && Date.now() - cached.at < CACHE_MS) {
      return cached.value;
    }
    const value = await load();
    cached = { at: Date.now(), value };
    return value;
  };
};

export const getSubscriberCount = cachedLoader(async () => {
  const data = await kitGet<SubscriberCountResponse>(
    "/subscribers?status=active&per_page=1&include_total_count=true&slim=true"
  );
  return data?.pagination?.total_count ?? data?.total_count ?? null;
});

const getEmailStats = cachedLoader(async () => {
  const data = await kitGet<EmailStatsResponse>("/account/email_stats");
  return data?.stats ?? null;
});

/** Live audience numbers for the sponsor page; null when nothing is available. */
export const getAudienceStats = async (): Promise<AudienceStats | null> => {
  const [subscribers, emailStats] = await Promise.all([
    getSubscriberCount(),
    getEmailStats(),
  ]);
  const openRate =
    emailStats?.open_tracking_enabled === false
      ? null
      : (emailStats?.open_rate ?? null);
  const clickRate =
    emailStats?.click_tracking_enabled === false
      ? null
      : (emailStats?.click_rate ?? null);

  if (subscribers === null && openRate === null && clickRate === null) {
    return null;
  }
  return { clickRate, openRate, subscribers };
};

/** Recent sent issues averaged for the sponsored links CTR. */
const CTR_ISSUES = 8;
const BROADCAST_SUBJECT = /^Shadcn Weekly #(?<issue>\d+):/u;
const SPONSOR_SECTION = /^<ArchiveSponsorSection\b(?<attrs>[^>]*)\/>/gmu;
const WEBSITE_ATTR = /\bwebsite="(?<url>[^"]+)"/u;

// Sponsor links carry UTM tags in emails; compare host + path only.
const linkKey = (raw: string) => {
  try {
    const url = new URL(raw);
    const host = url.host.replace(/^www\./u, "");
    return `${host}${url.pathname.replace(/\/$/u, "")}`.toLowerCase();
  } catch {
    return null;
  }
};

/** Sponsor link keys per issue: the "Together with" sponsor plus every sponsor block. */
const sponsorsByIssue = async () => {
  const issues = await getCollection("archive");
  return new Map(
    issues.map((entry) => {
      const blockUrls = [...(entry.body ?? "").matchAll(SPONSOR_SECTION)].map(
        (match) => WEBSITE_ATTR.exec(match.groups?.attrs ?? "")?.groups?.url
      );
      const keys = [entry.data.sponsor, ...blockUrls].flatMap((url) => {
        const key = url ? linkKey(url) : null;
        return key ? [key] : [];
      });
      return [entry.data.issue, new Set(keys)];
    })
  );
};

interface BroadcastsResponse {
  broadcasts?: { id: number; subject: string }[];
}
interface BroadcastStatsResponse {
  broadcast?: { stats?: { recipients?: number; status?: string } };
}
interface BroadcastClicksResponse {
  broadcast?: { clicks?: { url: string; unique_clicks: number }[] };
}

/**
 * Average sponsored links CTR (percent) over the last CTR_ISSUES sent issues:
 * per sponsor, unique clicks on its links divided by the issue's recipients.
 */
export const getSponsorClickRate = cachedLoader(async () => {
  const [list, sponsors] = await Promise.all([
    kitGet<BroadcastsResponse>("/broadcasts?per_page=100"),
    sponsorsByIssue(),
  ]);
  const sent = (list?.broadcasts ?? [])
    .flatMap((broadcast) => {
      const issue = Number(
        BROADCAST_SUBJECT.exec(broadcast.subject)?.groups?.issue
      );
      return (sponsors.get(issue)?.size ?? 0) > 0
        ? [{ id: broadcast.id, issue }]
        : [];
    })
    .toSorted((a, b) => b.issue - a.issue)
    .slice(0, CTR_ISSUES);

  const rates = await Promise.all(
    sent.map(async ({ id, issue }) => {
      const [stats, clicks] = await Promise.all([
        kitGet<BroadcastStatsResponse>(`/broadcasts/${id}/stats`),
        kitGet<BroadcastClicksResponse>(
          `/broadcasts/${id}/clicks?per_page=100`
        ),
      ]);
      const recipients = stats?.broadcast?.stats?.recipients ?? 0;
      if (stats?.broadcast?.stats?.status !== "completed" || recipients === 0) {
        return [];
      }
      const links = clicks?.broadcast?.clicks ?? [];
      return [...(sponsors.get(issue) ?? [])].map((key) => {
        const sponsorClicks = links
          .filter((click) => linkKey(click.url) === key)
          .reduce((sum, click) => sum + click.unique_clicks, 0);
        return (sponsorClicks / recipients) * 100;
      });
    })
  );
  const perSponsor = rates.flat();
  return perSponsor.length > 0
    ? perSponsor.reduce((sum, rate) => sum + rate, 0) / perSponsor.length
    : null;
});
