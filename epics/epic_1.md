# Epic 1 — Project Foundations & Tooling

## Overview
Establish the technical foundation for the SUDCare Dashboard so later epics can focus on feature delivery. This epic covers codebase scaffolding, core tooling, and shared UI primitives that every widget will rely on.

## Goals
- Deliver a reliable Next.js + TypeScript project skeleton with linting and formatting guardrails.
- Install and configure the styling, component, and charting libraries selected in the PRD.
- Provide an application shell and layout primitives that mirror the POC dashboard structure.
- Document baseline decisions so future contributors understand the stack and folder conventions.

## Stories

### Story 1 — Initialize project repo and CI guardrails
- **Why**: Ensure all contributors start from a consistent, typed Next.js project with automated linting/formatting to avoid style drift.
- **Implementation Details**:
  - Generate a fresh Next.js 14 project with the `app` router and TypeScript enabled.
  - Configure package manager (npm or pnpm) and lockfile; add scripts for `dev`, `build`, `lint`, and `test`.
  - Add ESLint + Prettier configs aligned with React/TypeScript best practices; integrate Tailwind plugin placeholders.
  - Stand up GitHub repo (or local git) with sensible `.gitignore`; wire a GitHub Actions workflow for lint + type check on PRs.
- **Acceptance Criteria**:
  - `npm run lint` and `npm run build` succeed in CI.
  - Base README documents how to install deps and run dev server.
  - Initial commit tagged or noted for future diff clarity.

### Story 2 — Configure TailwindCSS and shadcn/ui foundation
- **Why**: Styling decisions must be centralized early so widget work is consistent and efficient.
- **Implementation Details**:
  - Install TailwindCSS, postcss, autoprefixer; run Tailwind init with `content` paths covering `/app`, `/components`, `/lib`.
  - Configure base theme tokens (colors, spacing, fonts) to roughly match the POC screenshot; document tokens in `/styles/theme.md` (stub).
  - Integrate shadcn/ui CLI and generate initial primitives: `button`, `card`, `dialog`, `input`, `select`.
  - Create a global stylesheet importing Tailwind layers plus custom CSS variables for brand palette.
- **Acceptance Criteria**:
  - Tailwind classes resolve at build time; hot reload shows styles.
  - shadcn/ui components render with brand palette in a sandbox page (`/app/sandbox/page.tsx`).
  - Theme tokens are documented and ready for refinement in a later epic.

### Story 3 — Install charting & motion libraries with proof-of-concept
- **Why**: Validate that Recharts and Framer Motion work together before widget development begins.
- **Implementation Details**:
  - Install `recharts` and `framer-motion`; ensure tree-shaking works with Next.js.
  - Add lightweight utility wrappers (e.g., `<ResponsiveContainer>`) if needed for SSR compatibility.
  - Build a temporary `/app/demo-charts/page.tsx` showcasing a bar chart and modal animation using mocked data.
  - Document any SSR/client rendering caveats in `docs/technical-notes.md`.
- **Acceptance Criteria**:
  - Demo page loads without hydration warnings in dev mode.
  - Team understands how to embed charts inside responsive containers.
  - Identified caveats (if any) are captured for downstream epics.

### Story 4 — Create global layout shell and navigation scaffolding
- **Why**: A consistent layout, header, and spacing is required before inserting widgets to ensure fidelity to the POC layout.
- **Implementation Details**:
  - Implement application shell with header (title, dataset indicator placeholder) and footer metadata.
  - Set up responsive `Container` component limiting width and providing padding rules for desktop/tablet.
  - Define a 3-column CSS grid utility for the dashboard area; include breakpoints for tablet (2 columns) and mobile (single column).
  - Provision slots/hooks for global controls (dataset toggle, future filters) without implementing their business logic yet.
- **Acceptance Criteria**:
  - `/` renders a skeleton dashboard page with placeholder cards occupying the grid.
  - Layout matches the POC proportions at desktop width (verify via screenshot side-by-side).
  - Global components are exported for reuse by downstream widget epics.

## Dependencies
- None. This epic establishes the baseline for all subsequent work.

## Definition of Done
- Repository builds and lints cleanly in CI.
- Foundational tooling documented in README.
- Layout skeleton committed and ready for feature integration.
