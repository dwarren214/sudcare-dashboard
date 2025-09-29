# Tailwind Theme Tokens (Epic 1 Baseline)

This document captures the initial design tokens configured in `tailwind.config.ts`. Values provide a near match to the proof-of-concept dashboard and will be refined in later epics.

## Colors

- `brand.500` `#2e82f6` — Primary action and charts
- `brand.700` `#124cb0` — Accent text, hover states
- `accent.DEFAULT` `#f97316` — Highlights and alerts
- `accent.muted` `#fed7aa` — Soft accent backgrounds
- `success` `#22c55e`, `warning` `#facc15`, `danger` `#ef4444`

## Typography

- Font family: `Inter`, system sans fallback (`fontFamily.sans` in Tailwind)
- Base body color: `text-slate-900`
- Supporting copy: `text-slate-500`

## Border & Radius

- `borderRadius.lg` `0.75rem`
- Cards: 24px radius baked into `Card` component

## Shadows

- `shadow-sm` base for cards, with optional `shadow-md` on hover
- Custom `shadow-inset` utility (`boxShadow.inset`) for subtle widget depth

## Layout Utilities

- Container component: `max-w-6xl`, responsive paddings.
- Dashboard grid: `grid gap-4` with responsive columns (`sm:grid-cols-2`, `xl:grid-cols-3`).

Future epics will extend tokens for dark mode, typography scale, and accessibility contrast adjustments.
