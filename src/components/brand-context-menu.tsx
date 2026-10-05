import {
  AppWindowIcon,
  DownloadIcon,
  SquareDashedIcon,
  TypeIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  getAppIconSVG,
  getLogoMarkSVG,
  getLogoTypeSVG,
  Logo,
} from "@/components/logo";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLinkItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ROUTES } from "@/constants/routes";
import { META_THEME_COLORS } from "@/constants/site";

const themeInk = () =>
  document.documentElement.classList.contains("dark")
    ? META_THEME_COLORS.light
    : META_THEME_COLORS.dark;

const copySvg = async (svg: string, label: string) => {
  try {
    await navigator.clipboard.writeText(svg);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't access the clipboard");
  }
};

export const BrandContextMenu = ({ children }: { children?: ReactNode }) => (
  <ContextMenu>
    <ContextMenuTrigger>{children}</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem
        className="h-8"
        onClick={() => copySvg(getLogoMarkSVG(themeInk()), "Logomark as SVG")}
      >
        <Logo />
        Copy Logomark as SVG
      </ContextMenuItem>
      <ContextMenuItem
        className="h-8"
        onClick={() => copySvg(getLogoTypeSVG(themeInk()), "Logotype as SVG")}
      >
        <TypeIcon />
        Copy Logotype as SVG
      </ContextMenuItem>
      <ContextMenuItem
        className="h-8"
        onClick={() => copySvg(getAppIconSVG(), "App icon as SVG")}
      >
        <AppWindowIcon />
        Copy App Icon as SVG
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuLinkItem className="h-8" href={ROUTES.BRAND}>
        <SquareDashedIcon />
        Brand Guidelines
      </ContextMenuLinkItem>
      <ContextMenuLinkItem className="h-8" href={ROUTES.BRAND_ASSETS} download>
        <DownloadIcon />
        Download Brand Assets
      </ContextMenuLinkItem>
    </ContextMenuContent>
  </ContextMenu>
);
