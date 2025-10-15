# Epic 8 — Participant Filtering UX & Runtime Metrics

## Overview
Deliver the end-to-end participant filtering experience: new UI controls, filter-aware state management, metric recomputation, and analytics coverage. This epic builds on Epic 7’s data and aggregation foundation.

## Goals
- Provide a discoverable, accessible multi-select filter that supports include and exclude modes.
- Recompute all dashboard widgets from the current filter without noticeable lag.
- Surface filter state to users (summary chips, empty states) and instrument interactions for analytics.
- Ensure regressions are caught via unit/integration tests in both filtered and unfiltered scenarios.

## Stories

### Story 1 — Establish filter state management
- **Why**: Widgets need a single source of truth for active participants and filter mode.
- **Implementation Details**:
  - Extend `DashboardDataProvider` or create a dedicated `ParticipantFilterProvider` maintaining selections, available participants (with counts), and derived metrics.
  - Use memoization to cache aggregation results by selection key.
  - Expose helper hooks (`useFilteredMetrics`, `useParticipantOptions`) for widget components.
- **Acceptance Criteria**:
  - Provider initializes with “All participants” and recalculates when selections change.
  - Switching datasets reconciles selections (drops invalid IDs, warns via toast/log).
  - Unit tests cover selection toggles, include/exclude mode switching, and dataset change edge cases.

### Story 2 — Update widgets to consume filtered metrics
- **Why**: Every chart must respond to the filter without bespoke logic scattered through components.
- **Implementation Details**:
  - Replace direct `data.metrics` reads with hooks/selectors returning filtered aggregates.
  - Ensure loading/error/empty states reflect filter context (e.g., “No messages match the current filter”).
  - Optimize rendering to avoid unnecessary rerenders (e.g., via `useMemo`, equality checks).
- **Acceptance Criteria**:
  - Manual QA confirms each widget updates instantly when selections change.
  - Tests assert that filter changes propagate to chart props (using React Testing Library + mocked datasets).
  - Empty states render a helpful message and reset affordance when filtered data is empty.

### Story 3 — Build participant filter UI
- **Why**: Users need intuitive controls to apply filters without diving into documentation.
- **Implementation Details**:
  - Create a multi-select panel near the dataset selector with search, message counts, and selection badges.
  - Include mode toggle (include/exclude), “Clear filter” action, and summary chip reflecting selection count.
  - Ensure keyboard accessibility, sufficient contrast, and responsive layout for smaller screens.
- **Acceptance Criteria**:
  - UI passes accessibility checks (labeling, focus management, ARIA attributes).
  - Large participant lists remain navigable (virtualized list or grouped sections if necessary).
  - Snapshot/screener updates capture default, single-selection, multi-selection, and exclusion states.

### Story 4 — Instrumentation, performance, and QA automation
- **Why**: Filtering introduces new analytics and performance considerations that must be monitored.
- **Implementation Details**:
  - Emit analytics events for selection changes, include/exclude mode switches, and filter clears.
  - Add performance guardrails (e.g., console warnings/logs) if aggregation exceeds a threshold.
  - Expand test suite with integration tests simulating filter workflows; include storybook story for manual QA.
- **Acceptance Criteria**:
  - Analytics payloads include dataset, selection count, and duration between open/close interactions.
  - Vitest integration test runs in CI covering a basic filter flow.
  - Performance logging shows acceptable recompute times (<100ms on sample data) during dev profiling.

## Dependencies
- Requires new schema, aggregation utilities, and ingestion outputs from **Epic 7**.
- UI design review to align visual treatment with existing dashboard header components.

## Definition of Done
- Filter UI and updated widgets merged behind a feature flag (if needed) with documentation for rollout.
- Analytics dashboards updated to include filter usage metrics.
- QA checklist updated with filter test cases; production data regenerated via the new ingestion pipeline.
