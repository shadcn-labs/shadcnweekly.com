import { clampOgText, OG_MUTED, OgFrame, renderOgPng } from "@/lib/og";

export interface OgSimpleProps {
  description?: string;
  title: string;
}

export const OgSimple = ({ description, title }: OgSimpleProps) => (
  <OgFrame>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "920px",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: "72px",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.04,
        }}
      >
        {clampOgText(title, 90)}
      </div>
      {description ? (
        <div
          style={{
            color: OG_MUTED,
            display: "flex",
            fontSize: "30px",
            lineHeight: 1.35,
            maxWidth: "860px",
          }}
        >
          {clampOgText(description, 160)}
        </div>
      ) : null}
    </div>
  </OgFrame>
);

export const generateOg = (props: OgSimpleProps, requestUrl: URL) =>
  renderOgPng(<OgSimple {...props} />, requestUrl);
