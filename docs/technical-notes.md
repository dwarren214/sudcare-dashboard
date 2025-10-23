# Technical Notes — Epic 1

## Charting & Animation Stack

- **Client-only rendering**: Each Recharts component is wrapped in a `"use client"` module to avoid SSR issues. When importing into server components, use a client boundary (e.g., the chart card components or the `/demo-charts` page).
- **Responsive container**: All charts sit inside a fixed-height wrapper (`h-64`) and use `ResponsiveContainer` for width/height calculations to prevent hydration warnings.
- **Framer Motion**: Applied to chart cards (`ChartCard`) for entrance animations and to modal content for the expand/collapse preview. Motion components should stay inside client modules.

## Dataset Toggle Pattern

- Toolbar switch in `/demo-charts` demonstrates filtering the mocked data to exclude participant `p266`. Downstream epics can reuse this pattern by lifting state to a provider when real data loading is implemented.

## Known Caveats

- Recharts depends on the browser `ResizeObserver`; when testing in Node, provide a simple shim or run components in jsdom/browser-like environments.
- When adding new charts, ensure each container sets an explicit height; leaving it undefined results in an empty render.
- Framer Motion `AnimatePresence` was not required yet, but modal exit animations may be added once we build real widget expansion flows.
