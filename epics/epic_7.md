# Epic 7 — Data Pipeline & Schema for Participant Filtering

## Overview
Introduce a normalized data pipeline and schema upgrades that unlock participant-level filtering while keeping dashboard load times predictable. This epic produces the new JSON payloads, validators, and aggregation utilities required before any UI can consume filterable data.

## Goals
- Convert the master Excel workbook (and future exports) into canonical JSON datasets with interaction-level rows.
- Extend type validation and repository logic to understand the richer schema (interactions, participants, optional preaggregated metrics).
- Provide aggregation utilities that can recompute existing metrics from filtered interaction sets.
- Deliver automated validation so operators can trust the ingestion script output.

## Stories

### Story 1 — Build deterministic ingestion script
- **Why**: Replace manual spreadsheet gymnastics with a reproducible workflow that future datasets can reuse.
- **Implementation Details**:
  - Implement a Python script (reachable via `npm run ingest-data`) that reads the Excel workbook, normalizes Excel dates/times, cleans escaped characters, and emits structured JSON.
  - Support generating multiple dataset variants in a single run (e.g., `all`, `exclude_p266`, `exclude_<others>`).
  - Produce a validation report (counts by participant, missing fields, warnings for empty subcategories) printed to stdout and optionally saved to `/docs`.
- **Acceptance Criteria**:
  - Running the script against the current workbook reproduces existing totals (messages, category counts, satisfaction) within tolerance.
  - Generated files land in `/data` (or a staging folder) with deterministic ordering for clean diffs.
  - Documentation added to README/runbook describing usage, options, and troubleshooting.

### Story 2 — Update schema, types, and validation
- **Why**: The app must understand the richer dataset structure and fail fast when inputs are malformed.
- **Implementation Details**:
  - Extend `types/dashboard.ts` to include `interactions`, `participants`, and optional `preaggregated` blocks.
  - Introduce versioning or feature flags so CI can validate both old and new fixtures during transition.
  - Update `parseDashboardData` tests to cover success/failure cases with representative payloads.
- **Acceptance Criteria**:
  - TypeScript builds with the new interface definitions; stricter types catch missing fields.
  - Tests cover invalid interaction rows (bad timestamps, missing participants) and surface user-friendly errors.
  - Legacy JSON (current production) still parses when `preaggregated` is present but `interactions` absent, enabling gradual rollout.

### Story 3 — Implement aggregation utilities
- **Why**: Widgets require consistent metric arrays derived from whatever interaction set is active.
- **Implementation Details**:
  - Create pure functions that accept `InteractionRecord[]` and emit objects for weekly messages, categories, subcategories, assistant responses, and message time heatmaps.
  - Ensure functions are memoizable (accept optional cache keys) and handle zero-state gracefully.
  - Add unit tests comparing outputs against known fixture snapshots (e.g., ingest script sample filtered data).
- **Acceptance Criteria**:
  - Utilities match the existing aggregate numbers for the unfiltered dataset within rounding tolerance.
  - Hour and day-of-week functions correctly fill gaps (0 counts).
  - Test suite covers both include and exclude filtering scenarios.

### Story 4 — Wire repository to deliver enriched payloads
- **Why**: Frontend contexts need access to new fields without breaking server-side bundling.
- **Implementation Details**:
  - Update `data-repository.ts` to return enriched `DashboardData`, including ingestion metadata (script version, generatedAt).
  - Ensure bundle fallbacks register the additional fields.
  - Add analytics instrumentation for ingestion metadata (optional, to examine dataset version usage).
- **Acceptance Criteria**:
  - Dashboard boots with new JSON files in local dev without runtime errors.
  - Meta information (loadedAt, generatedAt) appears in provider options for display/telemetry.
  - Existing datasets remain selectable while new structure is phased in.

## Dependencies
- Requires access to the Excel workbook and any future raw transcript exports.
- Coordinates with DevOps/operations to document the ingestion runbook.

## Definition of Done
- Ingestion script, schema updates, and aggregation utilities merged with passing CI.
- Documentation instructs operators how to regenerate data and validate outputs.
- A sample filtered dataset demonstrates parity with current dashboard metrics when no filter is applied.
