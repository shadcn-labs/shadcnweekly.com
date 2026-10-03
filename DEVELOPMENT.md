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

| Script           | Description              |
| ---------------- | ------------------------ |
| `pnpm dev`       | Start development server |
| `pnpm build`     | Build for production     |
| `pnpm preview`   | Preview production build |
| `pnpm typecheck` | Run type checking        |
| `pnpm fix`       | Lint and fix code        |
| `pnpm check`     | Lint code                |
| `pnpm newsletter:draft` | Collect sources and write the next issue (`--dry-run` prints candidates only) |
| `pnpm newsletter:send`  | Schedule the latest issue as a Kit broadcast |

## Newsletter Automation

`.github/workflows/newsletter.yml` publishes an issue every Monday (06:00 UTC, with an idempotent 10:00 UTC safety run):

1. **Collect** (`scripts/newsletter/collect.ts`) items since the last issue (max 7 days): X via FxTwitter search, new entries in the official shadcn/ui registry directory, new awesome-shadcn-ui rows, TinyFish web search (Firecrawl fallback), Hacker News and new GitHub repos. Already-published URLs are dropped; a failing source is skipped with a warning.
2. **Draft** (`scripts/newsletter/draft.ts`) with Gemini (free tier). The model references collected items by id, so every link comes from a source. Output is validated, rendered to `src/content/archive/<n>.mdx` in the standard layout (sponsor and subscribe blocks copied from the previous issue), and new projects are added to `src/content/tools/`.
3. **Validate** with `pnpm build`.
4. **Publish**: push branch `newsletter/issue-<n>`, wait for its Vercel Preview deployment (required by the `main` ruleset), fast-forward `main` to that commit; Vercel deploys production.
5. **Send** (`scripts/newsletter/send.ts`): wait for `/issues/<n>` to be live, then schedule a Kit broadcast (all subscribers, 5 minutes out). Skipped if a broadcast with the same subject exists.

Required repository secrets: `GEMINI_API_KEY`, `TINYFISH_API_KEY`, `KIT_API_KEY`. Optional: `FIRECRAWL_API_KEY` (search fallback). Run manually from the Actions tab via "Run workflow". Failed runs email the repository owner.
