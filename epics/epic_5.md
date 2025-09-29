# Epic 5 — UX Polish, Quality Assurance & Deployment

## Overview
Wrap the project with visual polish, accessibility improvements, automated testing, and deployment workflows so the dashboard is production-ready and easy to maintain.

## Goals
- Align styling with the provided POC, ensuring consistent branding and readability.
- Guarantee accessibility and performance benchmarks are met.
- Establish automated testing coverage (unit, integration, visual) and manual QA scripts.
- Ship a documented deployment pipeline to Vercel with guidance for stakeholders.

## Stories

### Story 1 — Finalize visual design system and theming
- **Why**: A cohesive design system keeps the experience consistent while supporting future feature growth.
- **Implementation Details**:
  - Audit existing components against the POC screenshot; adjust typography scale, spacing, and color tokens accordingly.
  - Create `utils/colors.ts` with categorical color scales, success/error hues, and heatmap gradients.
  - Document design tokens and usage guidelines in `docs/design-system.md` with references to screenshot callouts.
  - Ensure dark mode is explicitly out-of-scope (documented) or supported if required.
- **Acceptance Criteria**:
  - Dashboard visuals match POC for primary states (collapsed grid, expanded modal) within acceptable variance.
  - Design documentation checked in and linked from README.
  - CSS custom properties allow future adjustments without refactoring components.

### Story 2 — Polish animations and micro-interactions
- **Why**: Smooth motion improves perceived quality and user trust.
- **Implementation Details**:
  - Use Framer Motion to add subtle transitions for widget hover, toggle switches, and modal entrance/exit.
  - Ensure reduced-motion preferences are respected (media query detection).
  - Add skeleton fade-ins and chart loading animations that do not impact performance.
  - Document animation durations and easing tokens for consistency.
- **Acceptance Criteria**:
  - Motion enhances UX without causing layout shifts or jank.
  - Reduced-motion users see non-animated fallbacks.
  - QA checklist confirms animation behaviour across modern browsers.

### Story 3 — Conduct accessibility and performance audits
- **Why**: The dashboard targets non-technical stakeholders and must be inclusive and performant.
- **Implementation Details**:
  - Run automated checks (Lighthouse, axe) and log issues; fix contrast, aria labels, and focus order problems.
  - Ensure charts convey information through text alternatives or data tables in expanded view (if necessary).
  - Optimize bundle size by code-splitting heavy charts and removing unused shadcn components.
  - Capture results in `docs/qa-report.md` with remediation notes.
- **Acceptance Criteria**:
  - Lighthouse scores ≥ 90 for Performance, Accessibility, Best Practices on desktop.
  - All actionable axe violations resolved or accepted with rationale.
  - Bundle analysis committed for future monitoring (`stats.html` artifact or README link).

### Story 4 — Expand automated testing coverage
- **Why**: Regression protection is critical once the dashboard goes live.
- **Implementation Details**:
  - Add unit tests for utilities (color scales, sorting, filtering) and context reducers.
  - Configure component-level tests (React Testing Library) for widget interactions (expand, toggle, loading states).
  - Introduce end-to-end tests (Playwright or Cypress) covering the primary user journeys.
  - Wire tests into CI with parallelization to keep run times manageable.
- **Acceptance Criteria**:
  - Test suites pass locally and in CI; failure output is easy to interpret.
  - Code coverage report generated with thresholds documented (e.g., 80% lines).
  - README includes guidance on running targeted test suites.

### Story 5 — Prepare release documentation and Vercel deployment pipeline
- **Why**: Stakeholders need a simple, repeatable path to view the dashboard.
- **Implementation Details**:
  - Create Vercel project, connect repository, and document environment variables (if any).
  - Add deployment badge/status to README and describe staging vs production workflows.
  - Produce a manual QA checklist for pre-release verification (data freshness, toggle behaviour, widget expansion).
  - Draft onboarding guide for future contributors covering project structure, data updates, and deployment steps.
- **Acceptance Criteria**:
  - Production deployment URL available and shared with stakeholders.
  - README updated with deployment instructions, data refresh process, and troubleshooting tips.
  - QA checklist stored in `docs/qa-checklist.md` and referenced during release sign-off.

## Dependencies
- Builds on completed widgets and interactions from **Epics 2–4**.

## Definition of Done
- Dashboard deployed to Vercel with documented process.
- Accessibility, performance, and testing benchmarks achieved and recorded.
- Stakeholders have clear instructions for maintaining data and codebase.
