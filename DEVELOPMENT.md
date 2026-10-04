# Development

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── head.astro       # HTML head with SEO
│   ├── site-header.astro # Navigation bar
│   ├── site-footer.astro # Footer
│   ├── subscribe-form.astro # Subscribe form
│   ├── sponsor-modal.tsx # Sponsor booking modal
│   └── tool-card.astro  # Tool card component
├── content/
│   └── archive/         # MDX newsletter issues
├── layouts/
│   └── site.astro       # Base layout
├── lib/
│   ├── constants.ts     # Site-wide constants
│   └── utils.ts         # Utility functions
└── pages/
    ├── index.astro      # Home page
    ├── archive.astro    # Archive listing
    ├── archive/[...slug].astro # Individual issue
    ├── tools.astro      # Tools page
    ├── sponsor.astro    # Sponsor page
    ├── contact.astro    # Contact page
    ├── privacy.astro    # Privacy policy
    └── api/
        └── subscribe.json.ts # Subscribe API
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Requirements

- Node.js >= 22.12.0
- pnpm

## Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run type checking |
| `pnpm fix` | Lint and fix code |
| `pnpm check` | Lint code |
| `pnpm newsletter:draft` | Collect sources and write the next issue (`--dry-run` prints candidates only) |
| `pnpm newsletter:send <n>` | Schedule issue `<n>` as a Kit broadcast |
| `pnpm newsletter:preview [n]` | Render issue `<n>` (default: latest) as the subscriber email and print the HTML file path |

## Newsletter Automation

Every Monday (06:00 UTC, with a 10:00 UTC safety run) `.github/workflows/newsletter-draft.yml` opens a PR with the next issue; merging it sends the email.

1. **Collect** (`scripts/newsletter/collect.ts`) items since the last issue (max 7 days): X via FxTwitter search, new entries in the official shadcn/ui registry directory, new awesome-shadcn-ui rows, TinyFish web search (Firecrawl fallback), Hacker News and new GitHub repos. Already-published URLs are dropped; a failing source is skipped with a warning.
2. **Draft** (`scripts/newsletter/draft.ts`) with Gemini (free tier). The model references collected items by id, so every link comes from a source. Output is validated, rendered to `src/content/archive/<n>.mdx` in the standard layout, and new projects are added to `src/content/tools/`. Updates to tools already listed add nothing: the model gets the tools list and marks matches (`existingTool`), and a project whose name or URL matches a listed tool is skipped too. Sponsors come from `src/data/sponsor-bookings.json` for the issue's week: the primary booking (or `HOUSE_SPONSOR` when none) gets "Together with" plus the first sponsor block; a secondary booking adds a block after the projects section.
3. **Validate** with `pnpm build`.
4. **Open PR** from branch `newsletter/issue-<n>`. Vercel deploys a Preview for review; edit content in the PR as needed. If a previous newsletter PR is still open, drafting is skipped until it is merged or closed.
5. **Send on merge** (`.github/workflows/newsletter-send.yml`, `scripts/newsletter/send.ts`): when a push to `main` adds an archive issue, wait for `/issues/<n>` to be live, then schedule a Kit broadcast (all subscribers, 5 minutes out). Editing an existing issue never resends it; a broadcast with the same subject is never created twice. Resend manually via "Run workflow" with the issue number.

Required repository secrets: `GEMINI_API_KEY`, `TINYFISH_API_KEY`, `KIT_API_KEY`. Optional: `FIRECRAWL_API_KEY` (search fallback). Run manually from the Actions tab via "Run workflow". Failed runs email the repository owner.

### Email design

Emails mirror the issue page design. `scripts/newsletter/email.ts` renders the issue content with inline styles; `scripts/newsletter/kit-template.html` is the outer frame (with Kit's required `{{ message_content }}`, `{{ unsubscribe_url }}` and `{{ address }}`). One-time setup in Kit: Email Templates → New Email Template → Create HTML Template, paste `kit-template.html`, name it exactly `Shadcn Weekly`, save. `newsletter:send` picks that template by name (falls back to the account default with a warning). Re-paste the file into Kit whenever it changes.

The double opt-in confirmation email is edited in Kit (form → Settings → Confirmation email → Edit Email Contents) and uses the account default template. `scripts/newsletter/confirmation-email.html` holds its body as two HTML blocks placed around Kit's own confirmation button (which must stay, since it confirms the subscriber); setup steps are in the file. Set the editor's From address to "Aniket from Shadcn Weekly".

## Sponsorships

`/sponsor` sells the four placements in `src/constants/sponsor.ts` through [Dodo Payments](https://dodopayments.com):

1. The booking modal collects details, placement and issue week(s); only open weeks at least 3 days out are offered (`availableWeeks` in `src/constants/sponsor-bookings.ts`).
2. `POST /api/sponsor/checkout` re-validates, re-checks availability and creates a Dodo checkout session carrying the booking as metadata.
3. Dodo calls `POST /api/sponsor/webhook` (Standard Webhooks signature verified). A `payment.succeeded` sponsor payment opens a PR on branch `sponsor/<payment_id>` adding the booking to `src/data/sponsor-bookings.json`, flagging any week conflicts. Retries are idempotent.
4. Review and merge the PR; issues drafted for those weeks include the sponsor. Buyer emails are never committed: look up the payment ID in Dodo.

Bookings made outside Dodo can be added to `src/data/sponsor-bookings.json` by hand; the build validates the file.

Vercel environment variables (redeploy after changing them):

| Variable | Value |
| --- | --- |
| `DODO_PAYMENTS_API_KEY` | Dodo API key |
| `DODO_PAYMENTS_ENVIRONMENT` | `test_mode` (default) or `live_mode` |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Signing secret of the webhook endpoint `https://www.shadcnweekly.com/api/sponsor/webhook` (event `payment.succeeded`) |
| `DODO_PRODUCT_PRIMARY`, `DODO_PRODUCT_PRIMARY_BUNDLE`, `DODO_PRODUCT_SECONDARY`, `DODO_PRODUCT_SECONDARY_BUNDLE` | Dodo product IDs (one-time price matching the page) |
| `GITHUB_BOOKINGS_TOKEN` | Fine-grained token for this repo with Contents and Pull requests read/write |
| `BOOKINGS_BASE_BRANCH` | Optional target branch for booking PRs (default `main`) |
