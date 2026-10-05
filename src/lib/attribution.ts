const STORAGE_KEY = "sw-attribution";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const readStored = (): Utm | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Utm) : null;
  } catch {
    return null;
  }
};

const externalReferrerHost = () => {
  if (!document.referrer) {
    return null;
  }
  try {
    const { host } = new URL(document.referrer);
    return host === location.host ? null : host;
  } catch {
    return null;
  }
};

/**
 * Records the visit's UTM params once, on the landing page. Visits without
 * UTM tags but from another site are tagged `utm_source=<host>`,
 * `utm_medium=referral`, so Kit still shows where they came from.
 */
export const captureAttribution = () => {
  const externalHost = externalReferrerHost();
  // Keep the landing-page attribution unless a new external visit starts in this tab.
  if (readStored() && !externalHost) {
    return;
  }
  const params = new URLSearchParams(location.search);
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      utm[key] = value;
    }
  }
  if (!utm.utm_source && externalHost) {
    utm.utm_source = externalHost;
    utm.utm_medium = "referral";
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
  } catch {
    // Storage unavailable (privacy mode); attribution is best-effort.
  }
};

/**
 * The signup page URL carrying the visit's UTM params. Kit parses this
 * `referrer` into the subscriber's built-in attribution (no custom fields).
 */
export const getReferrer = () => {
  const url = new URL(location.pathname, location.origin);
  for (const [key, value] of Object.entries(readStored() ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.href;
};
