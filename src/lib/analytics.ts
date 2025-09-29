import type { DatasetKey } from "../../types/dashboard";

type AnalyticsEventName =
  | "dataset_change"
  | "widget_expand"
  | "widget_close"
  | "widget_dwell";

export interface DatasetAnalyticsPayload {
  previous: DatasetKey | null;
  next: DatasetKey;
  triggeredAt: string;
  lastUpdated?: string | null;
  loadedAt?: string | null;
}

export interface WidgetAnalyticsPayload {
  widget: string;
  triggeredAt: string;
  dataset: DatasetKey;
  durationMs?: number;
}

export interface AnalyticsEvent<TPayload> {
  name: AnalyticsEventName;
  payload: TPayload;
}

export type AnalyticsSink = (event: AnalyticsEvent<unknown>) => void;

let currentSink: AnalyticsSink | null = trackViaConsole;

export function setAnalyticsSink(sink: AnalyticsSink | null) {
  currentSink = sink;
}

export function resetAnalyticsSink() {
  currentSink = trackViaConsole;
}

export function trackDatasetChange(payload: DatasetAnalyticsPayload) {
  dispatch({ name: "dataset_change", payload });
}

export function trackWidgetExpand(payload: WidgetAnalyticsPayload) {
  dispatch({ name: "widget_expand", payload });
}

export function trackWidgetClose(payload: WidgetAnalyticsPayload) {
  dispatch({ name: "widget_close", payload });
}

export function trackWidgetDwell(payload: WidgetAnalyticsPayload) {
  dispatch({ name: "widget_dwell", payload });
}

function dispatch(event: AnalyticsEvent<unknown>) {
  if (!isAnalyticsEnabled()) {
    return;
  }

  try {
    currentSink?.(event);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console -- dev-time visibility for analytics sink failures
      console.warn("[analytics] sink failed", error);
    }
  }
}

function trackViaConsole(event: AnalyticsEvent<unknown>) {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- placeholder analytics hook for development
    console.info("[analytics]", event);
  }
}

function isAnalyticsEnabled(): boolean {
  if (typeof process === "undefined") {
    return true;
  }
  const flag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS ?? "true";
  return flag !== "false";
}
