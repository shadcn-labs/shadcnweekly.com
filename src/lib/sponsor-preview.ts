import { ROUTES } from "@/constants/routes";
import { SITE } from "@/constants/site";
import type {
  SponsorContent,
  SponsorPlacement,
} from "@/constants/sponsor-bookings";

export const SPONSOR_PREVIEW_PARAM = "sponsor";

const PREVIEW_ISSUE_PATH = "/issues/1";

export const sponsorPreviewUrl = (placements: readonly SponsorPlacement[]) =>
  `${PREVIEW_ISSUE_PATH}?${SPONSOR_PREVIEW_PARAM}=${placements.join(",")}`;

export const SAMPLE_SPONSOR: Required<SponsorContent> = {
  description:
    "A short description of your product, highlighting what it does and why shadcn developers should care.",
  image:
    "/og?title=Your%20Product&description=Your%20banner%20image%20goes%20here.",
  name: "Your Product",
  title: "Your headline goes here",
  website: `${SITE.URL}${ROUTES.SPONSOR}`,
};
