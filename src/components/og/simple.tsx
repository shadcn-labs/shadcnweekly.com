import {
  clampOgText,
  OG_BORDER,
  OG_MUTED,
  OgBrandMark,
  OgFrame,
  renderOgPng,
} from "@/lib/og";

export interface OgSimpleProps {
  description?: string;
  title: string;
}

export const OgSimple = ({ description, title }: OgSimpleProps) => {
  const safeTitle = clampOgText(title, 160);
  const safeDescription = description
    ? clampOgText(description, 320)
    : undefined;

  return (
    <OgFrame>
      <div
        style={{
          display: "flex",
          left: "72px",
          position: "absolute",
          top: "72px",
        }}
      >
        <OgBrandMark />
      </div>

      <div
        style={{
          borderTop: `1px solid ${OG_BORDER}`,
          bottom: "96px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          left: 0,
          position: "absolute",
          right: 0,
          top: "144px",
        }}
      >
        <div
          style={{
            borderBottom: `1px solid ${OG_BORDER}`,
            borderTop: `1px solid ${OG_BORDER}`,
            display: "flex",
            fontSize: "64px",
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.05,
            paddingBottom: "28px",
            paddingLeft: "72px",
            paddingRight: "72px",
            paddingTop: "28px",
          }}
        >
          {safeTitle}
        </div>

        {safeDescription ? (
          <div
            style={{
              borderBottom: `1px solid ${OG_BORDER}`,
              color: OG_MUTED,
              display: "flex",
              fontSize: "32px",
              fontWeight: 400,
              lineHeight: 1.25,
              paddingBottom: "28px",
              paddingLeft: "72px",
              paddingRight: "72px",
              paddingTop: "28px",
            }}
          >
            {safeDescription}
          </div>
        ) : null}
      </div>
    </OgFrame>
  );
};

export const generateOg = (props: OgSimpleProps) =>
  renderOgPng(<OgSimple {...props} />);
