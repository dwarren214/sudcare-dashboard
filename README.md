# SUDCare Dashboard

Interactive dashboard prototype for the SUDCare chatbot study, built with the Next.js App Router and TypeScript.

## Prerequisites

- Node.js 20.x (matches local tooling and CI)
- npm 10+

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [`http://localhost:3000`](http://localhost:3000) to explore the dashboard shell and sample widgets.

## Available Scripts

- `npm run dev` — Launch the dev server in turbo mode.
- `npm run build` — Produce an optimized production bundle.
- `npm run start` — Serve the production build locally.
- `npm run lint` — Run ESLint with the Next.js config.
- `npm run format` — Check formatting via Prettier.
- `npm run format:fix` — Apply Prettier fixes.
- `npm run test` — Execute Vitest suites (jsdom environment).

## Tech Stack

- Next.js 14 App Router with React 18.
- Tailwind CSS 3 + shadcn/ui primitives (`components.json` manages generated components).
- Recharts and Framer Motion for animated data visualizations.
- TypeScript 5 with shared types in `types/` and linting/formatting via ESLint + Prettier.
- Vitest + Testing Library for unit/component tests.

## Project Layout

```
.
├─ src/
│  ├─ app/            # Route handlers, layouts, API endpoints, and global styles
│  ├─ components/
│  │  ├─ layout/      # Header, footer, and shell chrome
│  │  ├─ dashboard/   # Domain widgets composing the dashboard view
│  │  ├─ charts/      # Chart wrappers and configuration helpers
│  │  └─ ui/          # shadcn/ui building blocks
│  ├─ lib/            # Data loading, transforms, analytics helpers
│  └─ styles/         # Theme documentation and design notes
├─ data/              # JSON fixtures for demo datasets (`all`, `exclude_p266`, etc.)
├─ types/             # Shared TypeScript types and parsing helpers
├─ __tests__/         # Vitest-based unit and component tests
├─ docs/              # Product docs, design references, and screenshots
├─ epics/             # Roadmap and feature planning notes
├─ components.json    # shadcn/ui manifest for generating UI primitives
├─ next.config.mjs    # Next.js configuration
└─ tailwind.config.ts # Tailwind theme tokens and design system glue
```

## Data Flow

- Demo datasets live in `data/` as JSON exports. Update these files to tweak chart inputs or add new fixtures.
- `src/lib/data-repository.ts` abstracts loading datasets either from the filesystem (during SSR) or through the API layer.
- Client-side requests hit `src/app/api/dashboard-data/[dataset]/route.ts`, which validates the dataset key and returns normalized data.

## Testing

Vitest and Testing Library are configured for component-level testing. Run `npm run test` during development, or `npm run test:ci` for a one-off run in CI pipelines.

## Continuous Integration

The GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies, runs `npm run lint`, executes `npm run test:ci`, and builds the project on pushes and pull requests targeting `main`.

## Deployment

The app is optimized for Vercel or any platform that supports Next.js 14 serverless output. Use `npm run build` as the build command and ensure the platform’s Node version matches 20.x.

## Tooling Notes

- Tailwind CSS powers utility-first styling with custom tokens defined in `tailwind.config.ts`.
- shadcn/ui primitives live under `src/components/ui`; visit `/sandbox` to browse them.
- Recharts + Framer Motion demos render under `/demo-charts` for animation references.
- Additional product context and decisions are documented in `docs/` and `epics/`.
