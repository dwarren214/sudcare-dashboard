# Epic 9 — Dashboard Usability Enhancements

## Overview
Address usability gaps surfaced during internal testing by simplifying cohort selection, expanding temporal insight, aligning widget nomenclature with the latest messaging, and finally activating export affordances promised in earlier releases.

## Goals
- Remove redundant dataset toggles so participant filtering becomes the singular cohort control.
- Introduce a calendar-aligned trend view to complement the existing study-week perspective.
- Ensure widget labeling and copy reflect how stakeholders talk about “user interactions”.
- Ship production-ready exports (PNG + CSV) from expanded widgets, respecting active filters.

## Stories

### Story 1 — Retire legacy dataset toggle
- **Why**: The All vs. Exclude `p266` toggle confuses users now that the participant filter can reproduce the same cohort and more.
- **Implementation Details**:
  - Remove the toggle UI and related state while preserving shared layout spacing.
  - Provide a one-click “Exclude p266” saved filter chip (or documentation snippet) so analysts retain the prior workflow.
  - Audit analytics, routing, and tests for references to the dataset toggle; replace with participant filter events where meaningful.
  - Update empty states, help text, and docs to reference participant filtering as the canonical control.
- **Acceptance Criteria**:
  - Dataset toggle is no longer rendered in either board or expanded views.
  - Participant filter can recreate the Exclude `p266` cohort via preset or manual selection with no regressions.
  - Automated tests and lint checks pass, and no orphaned analytics events referencing the dataset toggle remain.

### Story 2 — Ship “Messages by Absolute Time” widget
- **Why**: Leadership wants to see aggregate message volume by calendar week to plan staffing and outreach.
- **Implementation Details**:
  - Extend ingestion to output `messages_by_calendar_week` with ISO week and week-start metadata.
  - Build a Recharts line/area hybrid component with smoothed segments for collapsed mode and full axis labels in the modal.
  - Share tooltip and color tokens with existing widgets; include totals and percent deltas vs. prior week in expanded view.
  - Ensure participant filter recomputations correctly rehydrate the calendar-week series (memoize on ISO week).
- **Acceptance Criteria**:
  - Widget renders in both collapsed and expanded states with responsive layouts and accessible axis labelling.
  - Tooltips show week start date, ISO week id, and total messages; expanded view optionally shows week-over-week delta.
  - Participant filter and saved cohort presets instantly recompute the trend without console errors.
  - QA sign-off includes visual review across 6+ months of sample data to confirm axis tick density.

### Story 3 — Rebrand to “User Interaction Fulfillment Rate”
- **Why**: Product messaging now emphasizes “user interactions” rather than “assistant responses”.
- **Implementation Details**:
  - Update widget title, legends, tooltips, aria labels, analytics events, and documentation references.
  - Rename supporting constants/IDs to reduce future confusion (keeping migration path via `deprecated` alias if needed).
  - Refresh screenshot fixtures/storybook stories impacted by textual changes.
- **Acceptance Criteria**:
  - UI, docs, and analytics emit the new name without regressions; no stale strings remain in the repo.
  - Tests verifying the widget continue to pass with updated snapshots.

### Story 4 — Enable widget exports (PNG + CSV)
- **Why**: Stakeholders need production-quality assets and data for presentations and offline analysis.
- **Implementation Details**:
  - Wire the `Download snapshot` control to an `html-to-image` (or similar) pipeline that captures expanded widget content at 2× DPR, trims excess padding, and streams a PNG download with timestamped filename.
  - Introduce a shared CSV serialization utility per widget type, ensuring localized headers and inclusion of active filter metadata in the file.
  - Add optimistic UI feedback (spinner + success toast) and error handling with retry guidance.
  - Instrument analytics for both export types and enforce download permissions (respecting `NEXT_PUBLIC_ENABLE_EXPORTS` flag).
- **Acceptance Criteria**:
  - Every expanded widget exports a high-resolution PNG and matching CSV reflecting current filters/toggles.
  - Files include standardized naming convention (`<widget>_<YYYYMMDD-HHmmss>_<cohort>.{png,csv}`).
  - Accessibility: keyboard users can trigger exports, progress indicators have appropriate ARIA roles, and focus returns to the control post-download.
  - Automated smoke tests cover PNG generation (mocked) and CSV serialization; manual QA links evidence in the release checklist.

## Dependencies
- Calendar-week aggregations require ingestion updates first (Story 2 blocker).
- Export functionality depends on stable widget DOM structure and availability of filter context metadata.
- Analytics pipeline must accept new event names before renaming or adding export tracking.

## Definition of Done
- Epic stories deployed behind feature flags (if needed) with rollout notes, QA checklist updates, and documentation (PRD + runbooks) refreshed.
- Product stakeholders review the absolute-time widget and download artifacts and sign off.
- Release notes include guidance on the new filter-first workflow and export capabilities.
