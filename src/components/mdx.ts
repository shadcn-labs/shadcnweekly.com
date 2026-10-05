import ArchiveSponsorSection from "@/components/archive-sponsor-section.astro";
import MdxLink from "@/components/mdx-link.astro";
import SubscribeCta from "@/components/subscribe-cta.astro";
import SubscribeSection from "@/components/subscribe-section.astro";

export const mdxComponents = {
  ArchiveSponsorSection,
  SubscribeCta,
  SubscribeSection,
  a: MdxLink,
};
