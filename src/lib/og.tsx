import { experimental_getFontFileURL, fontData } from "astro:assets";
import type { ReactNode } from "react";
import { satoriAstroOG } from "satori-astro";

import { Logo } from "@/components/logo";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = "image/png";

// Site light theme + primary (see src/styles/global.css).
export const OG_FOREGROUND = "#0a0a0a";
export const OG_MUTED = "#737373";
export const OG_BORDER = "#e5e5e5";
export const OG_PRIMARY = "#0082fb";
export const OG_PRIMARY_GRADIENT = "linear-gradient(#41a4ff, #0082fb)";

export const clampOgText = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

export const buildOgImagePath = ({
  description,
  title,
}: {
  description: string;
  title: string;
}) => {
  const params = new URLSearchParams({
    description,
    title,
  });

  return `${ROUTES.OG}?${params.toString()}`;
};

const OgBrandMark = () => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      flexDirection: "row",
      gap: "18px",
    }}
  >
    <div
      style={{
        alignItems: "center",
        backgroundImage: OG_PRIMARY_GRADIENT,
        borderRadius: "18px",
        boxShadow: "0 8px 24px rgba(0, 130, 251, 0.28)",
        display: "flex",
        height: "64px",
        justifyContent: "center",
        width: "64px",
      }}
    >
      <Logo width={42} height={42} style={{ color: "#ffffff" }} />
    </div>
    <span
      style={{
        fontSize: "34px",
        fontWeight: 700,
        letterSpacing: "-0.03em",
      }}
    >
      {SITE.NAME}
    </span>
  </div>
);

// Shared canvas: brand row on top (with an optional badge), page content at the bottom.
export const OgFrame = ({
  badge,
  children,
}: {
  badge?: ReactNode;
  children: ReactNode;
}) => (
  <div
    style={{
      background: "#ffffff",
      color: OG_FOREGROUND,
      display: "flex",
      fontFamily: "Geist",
      height: "100%",
      overflow: "hidden",
      position: "relative",
      width: "100%",
    }}
  >
    {/* Primary glow from the top-right corner. */}
    <div
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, rgba(0, 130, 251, 0.22), rgba(0, 130, 251, 0) 58%)",
        bottom: 0,
        display: "flex",
        left: 0,
        position: "absolute",
        right: 0,
        top: 0,
      }}
    />
    {/* Oversized logomark watermark, cropped by the right edge. */}
    <Logo
      width={620}
      height={620}
      style={{
        bottom: "-150px",
        color: "rgba(0, 130, 251, 0.09)",
        position: "absolute",
        right: "-120px",
      }}
    />

    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: "64px 72px 72px",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <OgBrandMark />
        {badge ?? (
          <span style={{ color: OG_MUTED, fontSize: "24px" }}>
            {new URL(SITE.URL).host.replace(/^www\./u, "")}
          </span>
        )}
      </div>
      {children}
    </div>
  </div>
);

// Satori needs static WOFF/TTF files: `--font-og` in astro.config.mjs provides them.
const loadOgFont = async (weight: 400 | 700, requestUrl: URL) => {
  const source = fontData["--font-og"]
    ?.find((font) => font.weight === String(weight) && font.style === "normal")
    ?.src.find((file) => file.format === "woff");

  if (!source) {
    throw new Error(`Missing Geist ${weight} WOFF in --font-og font data`);
  }

  const response = await fetch(
    experimental_getFontFileURL(source.url, requestUrl)
  );

  if (!response.ok) {
    throw new Error(`Failed to load Geist ${weight}: ${response.status}`);
  }

  return response.arrayBuffer();
};

// Cached per server instance; cleared on failure so the next request retries.
let ogFonts: Promise<[ArrayBuffer, ArrayBuffer]> | null = null;

const loadOgFonts = async (requestUrl: URL) => {
  ogFonts ??= Promise.all([
    loadOgFont(400, requestUrl),
    loadOgFont(700, requestUrl),
  ]);

  try {
    return await ogFonts;
  } catch (error) {
    ogFonts = null;
    throw error;
  }
};

export const renderOgPng = async (element: ReactNode, requestUrl: URL) => {
  const [regularFont, boldFont] = await loadOgFonts(requestUrl);

  return satoriAstroOG({
    height: OG_IMAGE_HEIGHT,
    template: element,
    width: OG_IMAGE_WIDTH,
  }).toImage({
    satori: {
      fonts: [
        {
          data: regularFont,
          name: "Geist",
          style: "normal",
          weight: 400,
        },
        {
          data: boldFont,
          name: "Geist",
          style: "normal",
          weight: 700,
        },
      ],
    },
  });
};
