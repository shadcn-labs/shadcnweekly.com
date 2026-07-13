import { Buffer } from "node:buffer";

import type { ReactNode } from "react";
import { satoriAstroOG } from "satori-astro";

import regularFontUrl from "@/assets/fonts/inter-latin-400-normal.woff?inline";
import boldFontUrl from "@/assets/fonts/inter-latin-700-normal.woff?inline";
import { Logo } from "@/components/logo";
import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_TYPE = "image/png";

export const OG_BORDER = "#27272a";
export const OG_MUTED = "#a1a1aa";

const decodeFont = (dataUrl: string) => {
  const [, encodedFont] = dataUrl.split(",", 2);

  if (!encodedFont) {
    throw new Error("Invalid embedded font data URL");
  }

  return Buffer.from(encodedFont, "base64");
};

// Keep fonts in the server bundle so Astro's build-time prerenderer and the
// deployed function do not depend on different filesystem layouts.
const regularFont = decodeFont(regularFontUrl);
const boldFont = decodeFont(boldFontUrl);

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

export const OgBrandMark = () => (
  <div
    style={{
      alignItems: "center",
      color: "#fafafa",
      display: "flex",
      flexDirection: "row",
      gap: "16px",
    }}
  >
    <Logo width={48} height={48} style={{ color: "#fafafa" }} />
    <span
      style={{
        fontSize: "36px",
        fontWeight: 700,
        letterSpacing: "-0.02em",
      }}
    >
      {SITE.NAME}
    </span>
  </div>
);

export const OgFrame = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      background: "#000000",
      color: "#fafafa",
      display: "flex",
      fontFamily: "Inter",
      height: "100%",
      position: "relative",
      width: "100%",
    }}
  >
    <div
      style={{
        borderLeft: `1px solid ${OG_BORDER}`,
        bottom: 0,
        display: "flex",
        left: "48px",
        position: "absolute",
        top: 0,
        width: "1px",
      }}
    />
    <div
      style={{
        borderRight: `1px solid ${OG_BORDER}`,
        bottom: 0,
        display: "flex",
        position: "absolute",
        right: "48px",
        top: 0,
        width: "1px",
      }}
    />
    <div
      style={{
        borderTop: `1px solid ${OG_BORDER}`,
        display: "flex",
        height: "1px",
        left: 0,
        position: "absolute",
        right: 0,
        top: "48px",
      }}
    />
    <div
      style={{
        borderBottom: `1px solid ${OG_BORDER}`,
        bottom: "48px",
        display: "flex",
        height: "1px",
        left: 0,
        position: "absolute",
        right: 0,
      }}
    />
    {children}
  </div>
);

export const renderOgPng = (element: ReactNode) =>
  satoriAstroOG({
    height: OG_IMAGE_HEIGHT,
    template: element,
    width: OG_IMAGE_WIDTH,
  }).toImage({
    satori: {
      fonts: [
        {
          data: regularFont,
          name: "Inter",
          style: "normal",
          weight: 400,
        },
        {
          data: boldFont,
          name: "Inter",
          style: "normal",
          weight: 700,
        },
      ],
    },
  });
