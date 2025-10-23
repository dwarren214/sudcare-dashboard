# PRD — SUDCare Study Dashboard (Web)

## 1) Objective
Build a modern, interactive web dashboard to visualize key chatbot study metrics. The app must:
- Load metrics from modular JSON files so data can be updated over time without code changes.
- Provide a one-click toggle to exclude outlier participants (initially `p266`) across **all** widgets.
- Let users **expand** any widget to a large view (show all labels, higher resolution), and collapse back.
- Be easy to share with non-technical stakeholders via a public URL (Vercel).

---

## 2) Success Criteria
- Non-technical stakeholders can open a URL and explore charts without installing anything.
- Two datasets (ALL vs. EXCLUDING `p266`) can be switched instantly via an in-app toggle.
- Every widget supports “expand” (modal/full-bleed) and “collapse” back to the main board.
- Distinct colors for categorical distributions (e.g., **TRUE**/**FALSE**) are visually clear.
- New data can be dropped in as JSON files and reflected after a simple redeploy.

---

## 3) Data Model & Files

### 3.1 JSON Schema (authoritative)
```json
{
  "dataset": "all | exclude_p266",
  "last_updated": "YYYY-MM-DD",
  "metrics": {
    "weekly_messages": [ { "week": 1, "messages": 0 } ],
    "messages_by_user": [ { "participant": "p123", "count": 0 } ],
    "categories": [ { "name": "string", "count": 0 } ],
    "subcategories": [ { "name": "string", "count": 0 } ],
    "suzy_can_respond": [ { "able": "TRUE", "count": 0 } ],
    "message_times": [ { "hour": 0, "count": 0 } ],
    "message_times_by_day": [ { "day": "Monday", "hour": 0, "count": 0 } ]
  }
}
```

### 3.2 TypeScript Interfaces (for compile-time safety)
```ts
type TF = "TRUE" | "FALSE";

interface WeeklyMessages { week: number; messages: number; }
interface UserMessages { participant: string; count: number; }
interface NamedCount { name: string; count: number; }
interface TFCount { able: TF; count: number; }
interface HourCount { hour: number; count: number; }
interface DayHourCount { day: string; hour: number; count: number; }

interface DashboardData {
  dataset: "all" | "exclude_p266";
  last_updated: string; // YYYY-MM-DD
  metrics: {
    weekly_messages: WeeklyMessages[];
    messages_by_user: UserMessages[];
    categories: NamedCount[];
    subcategories: NamedCount[];
    suzy_can_respond: TFCount[];
    message_times: HourCount[];
    message_times_by_day: DayHourCount[];
  };
}
```

### 3.3 Data File Conventions
- Store JSON in `/data` folder.
- Required files: `data-all.json`, `data-exclude-p266.json`.
- New metric types may be added by extending the `metrics` object with new arrays.
- Build pipeline statically imports these JSON fixtures so Vercel serverless functions can access them without local filesystem reads.

---

## 4) Features

### 4.1 Core Widgets
- **Messages by Study Week** — Bar chart
- **Messages by User** — Horizontal bar chart (top N participants)
- **Categories** — Bar chart
- **Subcategories** — Horizontal bar chart
- **Interaction Fulfillment Rate** — Donut chart showing intents met versus not met
- **Message Times** — Hour-of-day heatmap (0–23 hours) with optional day-of-week breakdown

### 4.2 Interactivity
- **Widget Expansion**  
  - Click any widget → expand to modal/full-width chart with all labels.  
  - Collapse returns to board view.
- **Outlier Toggle**  
  - Button toggles between ALL data vs. dataset excluding `p266`.  
  - Applies across all widgets at once.
- **Participant Filter**  
  - Multi-select control to include or exclude specific participants; all widgets recompute instantly.  
  - Search within the participant list, toggle between include/exclude modes, and clear with one action.
- **Intent Fulfillment Breakdown Toggle**  
  - Interaction Fulfillment widget can switch to a detailed view showing intent-not-met messages by category and subcategory.  
  - Available whenever the ingestion pipeline provides normalized interaction data.
- **Message Times View Toggle**  
  - Switch between aggregate hourly heatmap and day-of-week by hour matrix.  
  - Remembers last-selected view during the session.
*Search and time-range refinements are out-of-scope for the current dataset because the source does not reliably expose those dimensions across all metrics.*

### 4.3 Layout
- **Default board view**: compressed 3-column grid, smaller labels.  
- **Expanded view**: single widget focus, larger scale, all labels visible.  
- Responsive layout works on large and small screens.
- The hero “Study overview” and quick-link utilities were removed to keep the board compact and focused on metrics.

---

## 5) Technical Implementation

### 5.1 Frontend Stack
- **React + Next.js** (for Vercel hosting)
- **TailwindCSS + shadcn/ui** for styling, cards, modals, and buttons
- **Recharts** for chart components (BarChart, PieChart, Heatmap grid)
- **Framer Motion** for animations (expand/collapse, fades)

### 5.2 Data Loading
- Parse JSONs from `/data` at runtime or via lightweight API fetch.  
- Normalize data → feed into chart props.  
- Switch between datasets (all/excluding p266) without reload.
- Serverless deployments bundle the JSON fixtures and fall back to the bundled copy (with logging) if the filesystem path is unavailable.

### 5.3 Hosting
- **Primary**: Vercel (recommended one-click deployment).  
- **Alternative**: Netlify or static HTML export.

### 5.4 Analytics
- Lightweight telemetry hooks capture dataset toggles and widget expansion lifecycle events.  
- Instrumentation routes through a replaceable sink (`src/lib/analytics.ts`) and respects the `NEXT_PUBLIC_ENABLE_ANALYTICS=false` flag for local development.

---

## 6) Extensibility
- Add new widgets by:  
  1. Adding new JSON data array.  
  2. Creating a new chart component.  
  3. Adding to the board layout.  
- Central color palette in `/utils/colors.ts` for consistent theming.  
- Future option: show **delta views** (Δ differences) when toggling datasets.

---

## 7) Deliverables
- **GitHub repo** with structure:
  ```
  /components
    KPI.tsx
    ChartWrapper.tsx
    WidgetModal.tsx
  /data
    data-all.json
    data-exclude-p266.json
  /pages
    index.tsx
  /utils
    colors.ts
  README.md
  ```

- **README.md** includes:
  - Setup instructions (`npm install`, `npm run dev`)  
  - Data ingestion guide (drop JSONs into `/data`)  
  - Deployment guide (Vercel one-click)

---

## 8) Future Enhancements
- Multi-select participant exclusions (not just p266).  
- URL state persistence (e.g., shareable links reflecting toggle states).  
- Role-based access (team vs. public views).  
- Export options: CSV/PNG snapshot for individual widgets.  
- Deeper drill-ins for message timing (e.g., by participant cohort or automated clustering).  

---

## 9) Enhancement Plan — Day-of-Week Message Times View
- **Problem Statement**: Current Message Times heatmap aggregates all days, hiding weekday versus weekend behavior needed for staffing decisions.
- **Opportunity**: Leverage new `message_times_by_day` dataset to chart a day-of-week × hour heatmap without altering existing styling or interaction paradigms.
- **Desired Outcome**: Analysts can flip a concise toggle (e.g., `Day-of-week breakdown`) to compare hourly volume patterns by weekday in both board and expanded widget modes.
- **Scope**:
  - Data handling: extend transforms to hydrate missing hours gracefully (render zero-volume tiles so the grid stays consistent).
  - UI: reuse existing heatmap component styles; adapt layout to show weekday rows and 24 hourly columns with responsive wrapping.
  - Controls: add a toggle switch above the widget (and inside modal) persisting per-session selection; default to aggregate view.
  - Accessibility: ensure toggle is keyboard reachable and cells expose day/hour context via `aria-label`.
- **Acceptance Criteria**:
  - Toggle instantly switches dataset without page reload; zero states display informative empty messaging.
  - Heatmap renders all 7 days with hours 0–23; hours absent in JSON appear with zero count rather than missing tiles.
  - Expanded view exposes tooltip or legend clarifying coloring and selected mode.
  - QA checklist updated to include verifying both views with ALL and exclude-p266 datasets.
- **Dependencies**: Updated JSON schema and transforms shipping alongside this Epic; requires analytics tracking update if toggle interactions are captured.
- **Open Questions**:
  - Should the board remember toggle choice between sessions (local storage) or per visit?
  - Do stakeholders need CSV export for the day-of-week grid in Epic 6 or is that deferred?

---

## 10) Enhancement Plan — Multi-Participant Filtering
- **Problem Statement**: Leadership wants to slice all dashboard metrics by one or more participants (including exclusion scenarios). Current datasets only expose pre-aggregated totals, so recalculating charts on the fly is impossible.
- **Desired Outcome**: Analysts can choose any combination of participants. The dashboard immediately recomputes every widget (weekly volume, categorical breakdowns, assistant responses, message timing) using only the selected cohort.
- **Guiding Principles**:
  - Preserve fast initial load by bundling a canonical dataset while enabling client-side filtering.
  - Keep the ingestion workflow deterministic so future study exports can be converted without manual pivot tables.
  - Ensure filter state stays transparent (clear indicator, easy reset, analytics coverage).

### 10.1 Data Overhaul
- Replace flat aggregate JSON files with normalized interaction payloads (one row per participant message + metadata), plus optional cached aggregates for the default “All participants” view.
- Extend the JSON schema to include:
  - `interactions`: `{ id, participant, timestamp, studyWeek, category, subcategory, canRespond, messageHour, messageDay }`.
  - `participants`: per-participant summaries (message counts, first/last activity) to drive filter UI.
  - `preaggregated`: optional structure mirroring the current `metrics` block for bootstrapping.
- Update `types/dashboard.ts` and validator logic to enforce the richer shape while remaining backward compatible during migration (feature flag or versioned schema).
- Introduce a reproducible conversion script that ingests the master Excel workbook (or future CSV export), normalizes values (e.g., Excel serial dates, `_x009d_` artifacts), and emits the canonical JSON datasets (`all`, `exclude_p266`, future variants). Script becomes the single source of truth, eliminating manual pivot steps.

### 10.2 Runtime Filtering & Metrics Engine
- Add a filter-aware compute layer (utility module or context hook) that:
  - Accepts filtered interaction sets and produces the same aggregate arrays required by existing charts.
  - Supports inclusion and exclusion modes and defaults to “All participants” when no selection is active.
  - Memoizes calculations and leverages web workers if needed once datasets grow (future-proofing).
- Expand `DashboardDataProvider` (or sibling context) to maintain filter state, expose update methods, and broadcast derived metrics to widgets.
- Ensure toggling datasets resets invalid selections and preloads participant metadata to keep UI responsive.

### 10.3 UX Additions
- Add a “Participant filter” control near the dataset selector featuring:
  - Multi-select picker with search, message counts, and study-week hints.
  - Mode toggle (`Include only selected` vs. `Exclude selected`).
  - Persistent pill/summary reflecting the active filter and a one-click “Clear filter”.
- Provide inline empty states indicating when a filter yields zero interactions.
- Instrument filter changes (selection count, include/exclude mode, duration) via the existing analytics hook pattern.
- Update QA checklist to validate charts under filtered/unfiltered conditions and across both dataset presets.

### 10.4 Risks & Mitigations
- **Performance**: Large datasets could make client aggregation sluggish. Mitigate with memoization, lazy evaluation, and optionally server-side preaggregation for frequently used cohorts.
- **Schema Migration**: Existing fixtures/CI may break while types evolve. Plan a staged rollout (new schema columns marked optional, tests covering both versions) before fully deprecating the old format.
- **Data Quality**: Filters depend on accurate participant identifiers and timestamps. The ingestion script must surface validation errors (missing participants, NaN dates) with actionable logs.

### 10.5 Human Operations Impact
- **Step 1 — Exporting transcripts**: Still required, but the operator now feeds the raw export directly into the conversion script (CLI or notebook) instead of copy/pasting into pivot templates.
- **Step 2 — Manual calculations**: Script automates study-week derivation, registration date joins, and message-time conversions, removing hand-built formulas.
- **Step 3 — Handcrafted JSON**: Replaced by deterministic script output. Operator runs `npm run ingest-data -- --source <excel>` (or similar), reviews validation report, and checks the generated JSON into version control.
- Provide runbook documentation with checklist (input file naming, validation output interpretation, how to refresh both “all” and “exclude” datasets in one command).
