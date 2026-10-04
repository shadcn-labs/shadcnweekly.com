export const SITE = {
  AUTHOR: {
    NAME: "Aniket Pawar",
    TWITTER: "@alaymanguy",
    URL: "https://aniketpawar.com",
  },
  DESCRIPTION: {
    LONG: "A weekly newsletter of the best shadcn news, tutorials, projects and tools.",
    SHORT: "The Best Shadcn Newsletter",
  },
  KEYWORDS: [
    "shadcn",
    "shadcn/ui",
    "shadcn newsletter",
    "shadcn weekly",
    "React components",
    "Tailwind CSS",
    "Base UI",
    "Radix UI",
    "UI components",
    "design systems",
    "frontend newsletter",
  ],
  LOCALE: "en_US",
  NAME: "Shadcn Weekly",
  /** Organization that publishes the newsletter (copyright holder). */
  ORG: {
    NAME: "Shadcn Labs",
    URL: "https://www.shadcn-labs.com",
  },
  /** The newsletter's own X account (`twitter:site`); the author is `twitter:creator`. */
  TWITTER: "@shadcnweekly",
  URL: import.meta.env.SITE as string,
};

/** Browser UI color (`theme-color`), matching `--background` in global.css. */
export const META_THEME_COLORS = {
  dark: "#0a0a0a",
  light: "#ffffff",
};
