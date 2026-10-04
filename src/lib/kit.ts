const KIT_API = "https://api.kit.com/v4";
const CACHE_MS = 30 * 60 * 1000;

let cached: { at: number; count: number | null } | undefined;

interface SubscriberCountResponse {
  pagination?: { total_count?: number };
  total_count?: number;
}

export const getSubscriberCount = async (): Promise<number | null> => {
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.count;
  }

  let count: number | null = null;
  const apiKey = import.meta.env.KIT_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `${KIT_API}/subscribers?status=active&per_page=1&include_total_count=true&slim=true`,
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Kit-Api-Key": apiKey as string,
          },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (response.ok) {
        const data = (await response.json()) as SubscriberCountResponse;
        count = data.pagination?.total_count ?? data.total_count ?? null;
      }
    } catch {
      count = null;
    }
  }

  cached = { at: Date.now(), count };
  return count;
};
