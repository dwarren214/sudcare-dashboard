# Architecture

## Data Flow
The dashboard consumes static JSON fixtures that represent study metrics. Those payloads are validated on load and normalized into a shared context so every widget renders against the same source of truth.

1. **Repository** – `src/lib/data-repository.ts` reads JSON files on the server (or hits the `/api/dashboard-data/[dataset]` route on the client) and always pipes responses through `parseDashboardData` for runtime validation. Successful loads include metadata (`loadedAt`, `source`, `dataset`).
2. **Provider** – `DashboardDataProvider` (at `src/components/dashboard/dashboard-data-provider.tsx`) caches repository results by dataset key. It exposes hooks for widgets to read or set the active dataset, prefetch alternatives, and inspect dataset option metadata (labels, descriptions, `last_updated`, `loadedAt`). A lightweight event bus (`addChangeListener`) fires analytics-friendly payloads (`active-changed`, `loaded`, `error`) whenever datasets change so downstream features can react without bespoke wiring.
3. **UI Composition** – Server components fetch the initial dataset via `getAllDataset()` and hand it to the provider during render (`src/app/page.tsx`). Client-facing sections (e.g. `HomeDashboard`) consume `useDashboardData()` so dataset toggles, metadata badges, and future controls stay in sync with the active dataset state while rendering friendly descriptions for each option.
4. **API Route** – `/api/dashboard-data/[dataset]` mirrors repository logic for client-side fetching. Errors surface actionable `userMessage` strings that the provider stores for UI display.
5. **Analytics Sink** – `src/lib/analytics.ts` emits interaction events (dataset changes, widget expansion lifecycle) to a configurable sink. Local development defaults to console logging and can be disabled with `NEXT_PUBLIC_ENABLE_ANALYTICS=false`.

This layering decouples filesystem I/O from React state, makes dataset switches instant after the first load, and keeps validation logic centralized for future dataset additions.
