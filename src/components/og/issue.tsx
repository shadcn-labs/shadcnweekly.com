import type { CollectionEntry } from "astro:content";

import {
  clampOgText,
  OG_BORDER,
  OG_PRIMARY,
  OG_PRIMARY_GRADIENT,
  OgFrame,
  renderOgPng,
} from "@/lib/og";

export interface OgIssueProps {
  issue: CollectionEntry<"archive">;
}

export const OgIssue = ({ issue }: OgIssueProps) => (
  <OgFrame
    badge={
      <div
        style={{
          alignItems: "center",
          backgroundImage: OG_PRIMARY_GRADIENT,
          borderRadius: "999px",
          color: "#ffffff",
          display: "flex",
          fontSize: "26px",
          fontWeight: 700,
          height: "52px",
          letterSpacing: "-0.01em",
          paddingLeft: "24px",
          paddingRight: "24px",
        }}
      >
        Issue #{issue.data.issue}
      </div>
    }
  >
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div
          style={{
            color: OG_PRIMARY,
            display: "flex",
            fontSize: "26px",
            fontWeight: 700,
          }}
        >
          {issue.data.date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            timeZone: "UTC",
            year: "numeric",
          })}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "72px",
            fontWeight: 700,
            letterSpacing: "-0.045em",
            lineHeight: 1.04,
          }}
        >
          {clampOgText(issue.data.title, 60)}
        </div>
      </div>

      {issue.data.highlights.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: "12px",
            maxWidth: "960px",
          }}
        >
          {issue.data.highlights.slice(0, 3).map((highlight) => (
            <div
              key={highlight}
              style={{
                alignItems: "center",
                background: "#ffffff",
                border: `1px solid ${OG_BORDER}`,
                borderRadius: "999px",
                color: "#404040",
                display: "flex",
                fontSize: "24px",
                gap: "12px",
                height: "52px",
                paddingLeft: "20px",
                paddingRight: "22px",
              }}
            >
              <div
                style={{
                  background: OG_PRIMARY,
                  borderRadius: "999px",
                  display: "flex",
                  height: "10px",
                  width: "10px",
                }}
              />
              {clampOgText(highlight, 40)}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  </OgFrame>
);

export const generateIssueOg = (
  issue: CollectionEntry<"archive">,
  requestUrl: URL
) => renderOgPng(<OgIssue issue={issue} />, requestUrl);
