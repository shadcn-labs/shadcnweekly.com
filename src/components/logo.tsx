import { SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

const LOGO_PATHS = [
  "M0 128 80 208",
  "M16 40 168 192 320 40",
  "M336 128 256 208",
] as const;
const STROKE = `stroke-width="32" stroke-linecap="round" stroke-linejoin="round"`;
const pathsMarkup = LOGO_PATHS.map((d) => `<path d="${d}" />`).join("");

export const Logo = ({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-16 -60 368 368"
    fill="none"
    stroke="currentColor"
    strokeWidth="32"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("size-4", className)}
    aria-hidden="true"
    {...props}
  >
    {LOGO_PATHS.map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

export const getLogoMarkSVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 24 368 200" fill="none" stroke="${color}" ${STROKE} aria-label="${SITE.NAME}">${pathsMarkup}</svg>`;

export const getLogoTypeSVG = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-16 24 1520 200" fill="none" aria-label="${SITE.NAME}"><g stroke="${color}" ${STROKE}>${pathsMarkup}</g><text x="408" y="178" fill="${color}" font-family="Inter, ui-sans-serif, system-ui, sans-serif" font-size="150" font-weight="600" letter-spacing="-3">${SITE.NAME}</text></svg>`;

export const getAppIconSVG = () =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" aria-label="${SITE.NAME}"><defs><linearGradient id="sw-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#41a4ff" /><stop offset="1" stop-color="#0082fb" /></linearGradient></defs><rect width="512" height="512" fill="url(#sw-bg)" rx="128" /><g transform="translate(256 256) scale(0.95) translate(-168 -124)" stroke="#fff" ${STROKE}>${pathsMarkup}</g></svg>`;
