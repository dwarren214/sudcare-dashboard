# Epic 2 — Data Ingestion & State Management

## Overview
Deliver a resilient data layer that ingests JSON metric files, validates their shape, and exposes a unified state interface to the UI. This epic ensures the dashboard can switch between the "ALL" and "Exclude p266" datasets without reloading.

## Goals
- Model the dashboard metrics using robust TypeScript types with runtime validation.
- Load JSON files from `/data` and normalize them into reusable structures.
- Provide a shared context/store so all widgets consume the same dataset source.
- Prepare the groundwork for additional datasets and future metric types.

## Stories

### Story 1 — Define TypeScript models and runtime validators
- **Why**: Compile-time and runtime guarantees prevent bad data from crashing charts.
- **Implementation Details**:
  - Translate PRD schema into TypeScript interfaces located in `types/dashboard.ts`.
  - Introduce a runtime validator (e.g., Zod or `io-ts`) to assert JSON payloads conform to the schema.
  - Add unit tests covering valid vs. invalid payloads; include sample fixtures for future regression tests.
- **Acceptance Criteria**:
  - Type definitions are exported and can be reused by components and API routes.
  - Validator throws descriptive errors logged to the console during development builds.
  - Tests pass and live alongside fixtures in `__tests__/data/`.

### Story 2 — Implement data repository for JSON loading
- **Why**: Widgets need a clean abstraction to fetch datasets without duplicating I/O logic.
- **Implementation Details**:
  - Create `lib/data-repository.ts` exposing async functions `getAllDataset()` and `getExcludeP266Dataset()`.
  - Ensure functions support both server-side (Next.js server components) and client-side (fallback) execution.
  - Normalize raw JSON into typed `DashboardData` instances and annotate with metadata (e.g., `last_updated`).
  - Handle missing file errors gracefully with a fallback message for the UI.
- **Acceptance Criteria**:
  - Repository returns validated data objects in dev and production builds.
  - Error path covered by tests and logs actionable guidance (`npm run seed-data`).
  - Sample data files (`data-all.json`, `data-exclude-p266.json`) placed in `/data` with realistic fixture content.

### Story 3 — Build dashboard data context and hooks
- **Why**: Centralize data state so epics implementing widgets can subscribe without bespoke wiring.
- **Implementation Details**:
  - Implement a React context/provider (`DashboardDataProvider`) that stores current dataset, loading, and error states.
  - Expose hooks (`useDashboardData`, `useDatasetMeta`) for widgets to consume metrics.
  - Implement dataset switching logic that reuses repository functions and caches results to avoid redundant fetches.
  - Ensure provider hydrates correctly when server components pass initial data down to the client.
- **Acceptance Criteria**:
  - Provider wraps the dashboard layout; components can call hooks to access normalized metrics.
  - Switching datasets updates subscribed components without full page reload.
  - State management documented in `docs/architecture.md#data-flow`.

### Story 4 — Prepare dataset toggle API surface
- **Why**: Later epics need a predictable way to trigger dataset changes from UI controls.
- **Implementation Details**:
  - Extend the provider with an imperative method or dispatch (`setDataset(datasetKey)`).
  - Emit events or analytics hooks when dataset changes (placeholder implementation).
  - Expose dataset options metadata: labels, descriptions, and `last_updated` values for UI display.
  - Write integration test covering dataset swap and verifying observers re-render with new data.
- **Acceptance Criteria**:
  - Hooks return toggle helpers that UIs can call without internal knowledge of data fetching.
  - Tests confirm metrics update when dataset key changes.
  - Documentation explains how to add future datasets (e.g., new exclusion lists).

## Dependencies
- Relies on the project skeleton and layout from **Epic 1** to host providers.

## Definition of Done
- Data provider wired into the app shell with sample datasets rendering in a placeholder widget.
- Unit/integration tests for data loading and switching pass in CI.
- Documentation updated to guide future data additions.
