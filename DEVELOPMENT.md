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
2. **Draft** (`scripts/newsletter/draft.ts`) with Gemini (free tier). The model references collected items by id, so every link comes from a source. Output is validated, rendered to `src/content/archive/<n>.mdx` in the standard layout (sponsor and subscribe blocks copied from the previous issue), and new projects are added to `src/content/tools/`.
3. **Validate** with `pnpm build`.
4. **Open PR** from branch `newsletter/issue-<n>`. Vercel deploys a Preview for review; edit content in the PR as needed. If a previous newsletter PR is still open, drafting is skipped until it is merged or closed.
5. **Send on merge** (`.github/workflows/newsletter-send.yml`, `scripts/newsletter/send.ts`): when a push to `main` adds an archive issue, wait for `/issues/<n>` to be live, then schedule a Kit broadcast (all subscribers, 5 minutes out). Editing an existing issue never resends it; a broadcast with the same subject is never created twice. Resend manually via "Run workflow" with the issue number.

Required repository secrets: `GEMINI_API_KEY`, `TINYFISH_API_KEY`, `KIT_API_KEY`. Optional: `FIRECRAWL_API_KEY` (search fallback). Run manually from the Actions tab via "Run workflow". Failed runs email the repository owner.

### Email design

Emails mirror the issue page design. `scripts/newsletter/email.ts` renders the issue content with inline styles; `scripts/newsletter/kit-template.html` is the outer frame (with Kit's required `{{ message_content }}`, `{{ unsubscribe_url }}` and `{{ address }}`). One-time setup in Kit: Email Templates → New Email Template → Create HTML Template, paste `kit-template.html`, name it exactly `Shadcn Weekly`, save. `newsletter:send` picks that template by name (falls back to the account default with a warning). Re-paste the file into Kit whenever it changes.
