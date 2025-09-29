# Epic 4 — Interactive Controls & Widget Expansion

## Overview
Bring the dashboard to life with cross-cutting interactions: dataset toggling, widget expansion, and instrumentation. This epic ensures stakeholders can explore data dynamically without losing context.

## Goals
- Expose a polished dataset toggle that updates all widgets instantly and displays metadata.
- Implement the expandable widget pattern with accessible modals and responsive layouts.
- Capture analytics hooks for future insight into interaction patterns.

## Stories

### Story 1 — Deliver dataset toggle UI and metadata display
- **Why**: Stakeholders need fast switching between ALL and Exclude p266 datasets while seeing last update info.
- **Implementation Details**:
  - Implement toggle control in the header using shadcn `ToggleGroup` or segmented buttons.
  - Surface dataset labels, descriptions, and `last_updated` timestamp pulled from the provider.
  - Show loading state (spinner) on toggle while data fetch completes; disable control during transition.
  - Emit analytics event hook (placeholder) each time dataset changes.
- **Acceptance Criteria**:
  - Toggling updates every widget and header metadata within 250ms after data resolves.
  - Keyboard navigation supports dataset switching (arrow keys + space).
  - Tests cover toggle interactions and metadata rendering.

### Story 2 — Implement widget expansion modals with accessibility baked in
- **Why**: Expanded views must provide high-fidelity charts while meeting accessibility standards.
- **Implementation Details**:
  - Create `WidgetModal` component using shadcn `Dialog` with focus trapping, ESC support, and ARIA labels.
  - On expand, render the same chart component with `mode="expanded"` prop to surface full labels and more data.
  - Animate expand/collapse using Framer Motion (scale + fade) while preserving performance.
  - Provide "Download snapshot" button placeholder for future enhancements.
- **Acceptance Criteria**:
  - Users can open/close modal via mouse or keyboard; focus returns to trigger button on close.
  - Expanded charts display additional labels/tooltips as outlined in Epic 3 stories.
  - Cypress (or Playwright) test verifies accessibility behaviour (focus trap, ESC close).

### Story 3 — Wire analytics hooks for key interactions
- **Why**: Interaction telemetry will inform stakeholder engagement and future roadmap decisions.
- **Implementation Details**:
  - Define lightweight analytics interface (e.g., `logInteraction(eventName, payload)` stub) that can be swapped later.
  - Fire events for dataset toggles, modal open/close, and expand view dwell time (approximate with timers).
  - Document captured events and payload shape in `docs/analytics.md`.
  - Add toggles/env flag to disable analytics in development.
- **Acceptance Criteria**:
  - Analytics calls triggered without blocking user interactions (fire-and-forget pattern).
  - Event documentation committed for data team visibility.
  - Unit test ensures logging helper is invoked with expected payload structure.

## Dependencies
- Builds on widgets delivered in **Epic 3** and dataset APIs from **Epic 2**.

## Definition of Done
- Dataset toggle and expand modals are fully functional across desktop and mobile.
- Accessibility and interaction tests pass in CI.
- Analytics hooks documented and ready for future instrumentation.
