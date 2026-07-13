import type { CollectionEntry } from "astro:content";

import {
  clampOgText,
  OG_BORDER,
  OgBrandMark,
  OgFrame,
  renderOgPng,
} from "@/lib/og";

/** Lucide ArrowRight — inlined because lucide-react uses hooks that Satori can't run. */
const ArrowRightIcon = () => (
  <svg
    width="36"
    height="36"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fafafa"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="Arrow Right"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export interface OgIssueProps {
  issue: CollectionEntry<"archive">;
}

export const OgIssue = ({ issue }: OgIssueProps) => {
  const highlights =
    issue.data.highlights.length > 0
      ? issue.data.highlights.slice(0, 6)
      : [issue.data.title];

  return (
    <OgFrame>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            borderBottom: `1px solid ${OG_BORDER}`,
            display: "flex",
            flexDirection: "row",
            gap: "20px",
            paddingBottom: "28px",
            paddingLeft: "72px",
            paddingRight: "72px",
            paddingTop: "72px",
          }}
        >
          <OgBrandMark />
          <div
            style={{
              alignItems: "center",
              background: "#fafafa",
              borderRadius: "999px",
              color: "#09090b",
              display: "flex",
              fontSize: "22px",
              fontWeight: 700,
              height: "40px",
              justifyContent: "center",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            #{issue.data.issue}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            gap: "28px",
            justifyContent: "center",
            paddingBottom: "72px",
            paddingLeft: "72px",
            paddingRight: "72px",
            paddingTop: "48px",
          }}
        >
          {highlights.map((item) => (
            <div
              key={item}
              style={{
                alignItems: "center",
                display: "flex",
                flexDirection: "row",
                fontSize: "40px",
                fontWeight: 700,
                gap: "20px",
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              <ArrowRightIcon />
              <span>{clampOgText(item, 72)}</span>
            </div>
          ))}
        </div>
      </div>
    </OgFrame>
  );
};

export const generateIssueOg = (issue: CollectionEntry<"archive">) =>
  renderOgPng(<OgIssue issue={issue} />);
