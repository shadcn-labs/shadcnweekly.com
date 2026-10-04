export const ROUTES = {
  ABOUT: "/about",
  CONTACT: "/contact",
  FAVICON: "/favicon.svg",
  HOME: "/",
  ISSUES: "/issues",
  /** PNG render of `components/logo.tsx`, for places that can't use the SVG (emails, schema). */
  LOGO: "/logo.png",
  OG: "/og",
  PRIVACY: "/privacy",
  SITEMAP: "/sitemap-index.xml",
  SPONSOR: "/sponsor",
  SPONSOR_CHECKOUT_API: "/api/sponsor/checkout",
  SPONSOR_THANKS: "/sponsor/thanks",
  SUBSCRIBE_API: "/api/subscribe.json",
  TOOLS: "/tools",
} as const;
