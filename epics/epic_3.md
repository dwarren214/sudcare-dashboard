# Epic 3 — Dashboard Layout & Core Widgets

## Overview
Implement the main dashboard experience by composing the responsive grid and rendering all six core widgets backed by normalized data. This epic turns the skeleton from Epic 1 into a functioning, data-driven board.

## Goals
- Deliver a responsive 3-column dashboard layout that adapts gracefully to tablet and mobile.
- Establish reusable widget scaffolding (headers, dataset badges, expand buttons).
- Implement each required chart with accurate mappings to the metrics schema.
- Ensure widgets handle loading/empty/error states consistently.

## Stories

### Story 1 — Finalize responsive dashboard grid and widget wrapper
- **Why**: Widgets need a consistent frame that handles spacing, headers, and action buttons before charts are plugged in.
- **Implementation Details**:
  - Convert the placeholder cards to a `WidgetCard` component composed of shadcn `Card` primitives plus custom header/footer slots.
  - Implement responsive grid using CSS Grid + Tailwind utilities with defined breakpoints (>=1280px: 3 columns, 768–1279px: 2 columns, <768px: 1 column).
  - Add dataset badge placeholder, expand button placeholder, and optional info tooltip areas.
  - Provide `WidgetState` subcomponents for loading/error/empty cases.
- **Acceptance Criteria**:
  - Grid renders with consistent gutter spacing that matches the POC proportions.
  - `WidgetCard` exported and ready for charts to slot into its `body` region.
  - Placeholder states visible in Storybook/sandbox for QA.

### Story 2 — Implement weekly cadence charts (Weekly messages & Messages by user)
- **Why**: These charts anchor the narrative around message volume per week and participant engagement.
- **Implementation Details**:
  - Create `<WeeklyMessagesChart>` rendering a Recharts vertical bar chart with week numbers on the x-axis; support tooltips and axis labels. All views should display full 12 week study timeframe.
  - Create `<MessagesByUserChart>` as a horizontal bar chart limited to top-N participants with “View all” option triggered by expand mode.
  - Add sorting utilities to limit dataset in collapsed view while preserving full data in expanded view.
  - Handle zero-data states with friendly copy and CTA to check dataset freshness.
- **Acceptance Criteria**:
  - Charts consume data via `useDashboardData`; toggling datasets updates values automatically.
  - Axis labeling remains legible at narrow widths (truncate labels, add tooltips).
  - Unit tests cover sorting and top-N logic.

### Story 3 — Implement categorical distribution charts (Categories & Subcategories)
- **Why**: Stakeholders need to see how conversations break down across categories.
- **Implementation Details**:
  - Build `<CategoriesChart>` and `<SubcategoriesChart>` components as bar charts (vertical/horizontal as specified) with shared color palette.
  - Implement color scale helper to assign distinct colors up to N categories; ensure consistent mapping between collapsed and expanded views.
  - Keep props flexible for future filtering layers while delivering full dataset views today.
  - Include aggregate percentage in headers (e.g., top category share) for quick scanning.
- **Acceptance Criteria**:
  - Charts render dynamically sized bars, handle >10 categories via scroll or condensed layout in collapsed state.
  - Color palette passes contrast checks (WCAG AA) for text overlays.
  - Components documented in Storybook with different data shapes.

### Story 4 — Implement assistant response and temporal charts
- **Why**: Complete the widget suite with binary outcomes and time-of-day insights.
- **Implementation Details**:
  - Build `<AssistantResponseChart>` as a donut chart using TRUE/FALSE counts; include legend with color tokens from theme.
  - Build `<MessageTimesHeatmap>` representing hours 0–23 on x-axis with intensity scale; use responsive square grid for clarity.
  - Provide tooltips with raw counts and percentages; support keyboard focus for accessibility.
  - Ensure charts display meaningful placeholders when data is sparse (e.g., greyed grid).
- **Acceptance Criteria**:
  - Donut chart animates values on load (basic animation) and displays totals in center label.
  - Heatmap handles missing hours gracefully and shows scale legend.
  - QA verifies widgets remain legible in expanded mode at 1440px width.

### Story 5 — Wire empty/loading/error states across all widgets
- **Why**: Shared resilience ensures the dashboard degrades gracefully when data issues occur.
- **Implementation Details**:
  - Integrate repository loading/error signals into `WidgetCard` placeholders.
  - Add skeleton loaders for initial page load using Tailwind utility classes or shadcn skeleton component.
  - Provide actionable error messaging ("Data file missing" with link to README instructions).
  - Snapshot tests to capture default, loading, empty, error variations.
- **Acceptance Criteria**:
  - Toggling datasets shows skeleton for first load then caches results for instant subsequent loads.
  - Error states render without crashing and communicate next steps.
  - Snapshot tests committed and passing in CI.

## Dependencies
- Requires data context and toggle API surface from **Epic 2**.

## Definition of Done
- All six widgets render correctly using sample data in both datasets.
- Layout adapts from desktop to mobile without overlapping labels.
- Placeholder/skeleton states covered by automated tests or snapshots.
