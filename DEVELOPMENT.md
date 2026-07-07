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
