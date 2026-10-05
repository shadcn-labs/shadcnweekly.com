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
