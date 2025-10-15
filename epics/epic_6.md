# Epic 6 — Day-of-Week Message Times View

## Overview
Deliver an alternate view of the Message Times heatmap that breaks volume down by hour and weekday, enabling staffing and engagement analysis without sacrificing the existing visualization style.

## Goals
- Introduce the `message_times_by_day` dataset throughout the data pipeline with complete typing and transforms.
- Give users a clear toggle to swap between aggregate hourly view and the day-of-week matrix in both board and expanded widget layouts.
- Preserve the current heatmap aesthetic while ensuring days/hours with zero volume remain visible for comparison.
- Document QA coverage and analytics updates so the new interaction is tracked and testable.

## Stories

### Story 1 — Extend data model and transforms
- **Why**: The frontend must gracefully consume the new dataset while filling missing hour/day combinations with zero counts to keep the grid aligned.
- **Implementation Details**:
  - Update shared TypeScript types (`DayHourCount`) and schema validation to include `message_times_by_day`.
  - Add transformer that maps JSON into a 7×24 matrix, injecting zero-count cells for omitted hours.
  - Surface helper selectors/hooks so widgets and sandbox tools can access both aggregate and day-specific views.
  - Ensure exclude-`p266` dataset keeps parity; flag differences in docs/changes-made.md if gaps exist.
- **Acceptance Criteria**:
  - Type checks pass with new interfaces; tests cover matrix generation including missing-hour backfill.
  - Sandbox/demo page renders both datasets without runtime warnings.
  - Lint/test suite passes without regressions.

### Story 2 — Implement toggleable heatmap UI
- **Why**: Analysts must be able to quickly pivot between aggregate and weekday views inside the dashboard without losing orientation.
- **Implementation Details**:
  - Embed a compact toggle (e.g., segmented control or switch) at the top of the Message Times widget and expanded modal.
  - Reuse existing heatmap color ramp; adjust layout to show weekday rows (Mon–Sun) and hour columns with responsive wrapping.
  - Enhance accessibility: keyboard focus order, `aria-pressed`/`aria-controls` for toggle, and descriptive cell labels including day + hour.
  - Persist the selected view for the session (React state + context/store) so board and modal stay in sync.
- **Acceptance Criteria**:
  - Toggle updates the chart instantly with graceful loading/empty states.
  - Cells display zero counts when applicable; legend clarifies which mode is active.
  - Both board and expanded modal respect the selected mode and maintain responsive sizing down to tablet width.

### Story 3 — QA, analytics, and documentation updates
- **Why**: New interactions require tracking and coverage to prevent regressions.
- **Implementation Details**:
  - Instrument analytics event (e.g., `message_times_view_changed`) capturing selected mode and dataset (all vs exclude).
  - Extend automated/component tests to cover toggle interaction and ensures zero-fill behaviour renders as expected.
  - Update QA checklist and PRD section 9 with testing steps and data edge cases.
  - Document analyst guidance in README or docs/changes-made.md for interpreting the new view.
- **Acceptance Criteria**:
  - Analytics flag guarded via existing env toggles; event appears in local debug logs.
  - New tests run in CI and cover toggle + data hydration.
  - Documentation outlines how zero-volume slots appear and where source data lives.

## Dependencies
- Builds on Message Times widget delivered in Epics 2 & 3, and requires updated datasets checked into `/data`.
- Relies on analytics infrastructure from Epic 5 for event emission.

## Definition of Done
- Dashboard ships with a working day-of-week heatmap toggle in both views, backed by resilient data transforms.
- Analytics and QA materials updated, with tests ensuring mode switching and zero-fill behaviour remain stable.
- Stakeholders can articulate when the enhancement is appropriate to use, referencing updated documentation.
