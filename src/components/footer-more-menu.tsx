import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MORE_PRODUCTS, SHADCN_LABS_PROJECTS } from "@/constants/products";
import { withUtm } from "@/lib/utm";

export const FooterMoreMenu = () => (
  <DropdownMenu>
    <DropdownMenuTrigger className="inline-flex items-center gap-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:text-foreground">
      and more
      <ChevronDownIcon
        aria-hidden="true"
        className="size-3.5 transition-transform in-data-popup-open:rotate-180"
      />
    </DropdownMenuTrigger>
    <DropdownMenuContent side="top" className="w-48">
      <DropdownMenuGroup>
        {MORE_PRODUCTS.map((product) => (
          <DropdownMenuLinkItem
            key={product.name}
            href={withUtm(product.url, "footer")}
          >
            {product.name}
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>Shadcn Labs projects</DropdownMenuLabel>
        {SHADCN_LABS_PROJECTS.map((project) => (
          <DropdownMenuLinkItem
            key={project.name}
            href={withUtm(project.url, "footer")}
          >
            {project.name}
          </DropdownMenuLinkItem>
        ))}
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
