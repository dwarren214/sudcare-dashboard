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

## Adapting the Dashboard

### Data model overview

- Each dataset JSON must follow the shape below. Validation logic in `types/dashboard.ts` enforces this before the UI renders.

```json
{
  "dataset": "all",
  "last_updated": "2025-09-27",
  "metrics": {
    "weekly_messages": [{ "week": 1, "messages": 111 }],
    "messages_by_user": [{ "participant": "p266", "count": 250 }],
    "categories": [{ "name": "wellness", "count": 55 }],
    "subcategories": [{ "name": "gratitude/acknowledgment", "count": 42 }],
    "suzy_can_respond": [{ "able": "TRUE", "count": 333 }],
    "message_times": [{ "hour": 13, "count": 18 }]
  }
}
```

- `dataset` is a short slug that aligns with the dataset toggle exposed in the UI.
- `last_updated` should be a `YYYY-MM-DD` string so the header displays canonical freshness.
- `metrics` arrays can be renamed to reflect your study terminology, but keep the same structure unless you also update the widget props and the TypeScript types.

### Add or replace datasets

1. Duplicate `data/data-all.json` and tailor the records to your study. Keep numeric fields as numbers so chart scales remain accurate.
2. If you introduce a new dataset key, add it to the `DatasetKey` union in `types/dashboard.ts` and mirror the change in:
   - `DATASET_FILE_MAP` and `BUNDLED_DATASET_PAYLOADS` inside `src/lib/data-repository.ts`.
   - The `DatasetKeys` array and label/description logic in `src/components/dashboard/dashboard-data-provider.tsx`.
3. The provider automatically exposes the dataset through the toggle in `home-dashboard.tsx`. Adjust the quick summary or modal copy there if your new dataset needs different context messaging.
4. Run `npm run dev` and confirm the dataset loads without console validation errors. If you see a `DashboardDataValidationError`, inspect the path noted in the error and ensure the JSON matches the expected schema.

### Customize widgets and layout

- Widget components live under `src/components/dashboard/widgets/`. Each file reads a single slice of `DashboardData` and renders inside a `WidgetCard`, so you can swap the charting logic without affecting the rest of the layout.
- `src/components/dashboard/home-dashboard.tsx` composes the grid. To remove or rename tiles, edit the `summaryMetrics` array and the widget sections in that file. Keep the memoized selectors near the top in sync with any new metric names.
- Cross-widget helpers (e.g., `summarizeAssistantResponses` in `src/lib/dashboard-transforms.ts`) are safe places to add derived metrics before passing them into charts.
- When creating a new widget, export it from `widgets/`, add it to the grid, and provide default fallbacks so the dashboard degrades gracefully if a metric is absent.

### Suggested adaptation workflow

1. Sketch the widgets and metrics you need, mapping each to either an existing metric array or a new addition in the dataset JSON.
2. Update the JSON fixture(s) in `data/` and re-run the app to confirm validation still succeeds.
3. Modify or create widgets to read your metrics, keeping reusable UI primitives in `src/components/ui/` for consistency.
4. Add tests under `__tests__/` to cover critical transforms or formatting if you change data shape or introduce new calculations.

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
