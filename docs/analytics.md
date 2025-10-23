# Analytics Events

The dashboard fires lightweight analytics hooks to capture interaction patterns. Events are dispatched through `src/lib/analytics.ts`, which exposes a configurable sink (`setAnalyticsSink`) so a real telemetry client can be wired in later.

Analytics can be disabled by setting the environment variable `NEXT_PUBLIC_ENABLE_ANALYTICS=false`.

## Event Catalog

| Event name       | Trigger                                    | Payload fields                                                                 |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| `dataset_change` | Active dataset toggled in the header        | `previous` (DatasetKey \| null), `next` (DatasetKey), `triggeredAt` (ISO string), `lastUpdated` (string \| null), `loadedAt` (string \| null) |
| `widget_expand`  | User opens a widget in expanded modal view  | `widget` (string identifier), `dataset` (DatasetKey), `triggeredAt` (ISO string) |
| `widget_close`   | Expanded widget is dismissed                | `widget` (string identifier), `dataset` (DatasetKey), `triggeredAt` (ISO string) |
| `widget_dwell`   | Derived when a widget closes after being open; logs approximate dwell duration | `widget` (string identifier), `dataset` (DatasetKey), `triggeredAt` (ISO string), `durationMs` (number) |

All events are fire-and-forget; errors produced by the configured sink are swallowed in production builds but surfaced to the console in development for visibility.
