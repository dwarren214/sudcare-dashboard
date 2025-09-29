import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetAnalyticsSink,
  setAnalyticsSink,
  trackDatasetChange,
  trackWidgetClose,
  trackWidgetDwell,
  trackWidgetExpand,
} from "@/lib/analytics";

const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;

afterEach(() => {
  if (ORIGINAL_FLAG === undefined) {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  } else {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = ORIGINAL_FLAG;
  }
  resetAnalyticsSink();
});

describe("analytics", () => {
  it("dispatches dataset change events through the configured sink", () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    trackDatasetChange({
      previous: "all",
      next: "exclude_p266",
      triggeredAt: "2025-01-01T00:00:00.000Z",
      lastUpdated: "2025-01-01",
      loadedAt: "2025-01-01T00:00:00.000Z",
    });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith({
      name: "dataset_change",
      payload: {
        previous: "all",
        next: "exclude_p266",
        triggeredAt: "2025-01-01T00:00:00.000Z",
        lastUpdated: "2025-01-01",
        loadedAt: "2025-01-01T00:00:00.000Z",
      },
    });
  });

  it("captures widget lifecycle events with dataset context", () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);

    const timestamp = "2025-01-02T12:00:00.000Z";

    trackWidgetExpand({ widget: "weekly-messages", dataset: "all", triggeredAt: timestamp });
    trackWidgetClose({ widget: "weekly-messages", dataset: "all", triggeredAt: timestamp });
    trackWidgetDwell({ widget: "weekly-messages", dataset: "all", triggeredAt: timestamp, durationMs: 1234 });

    expect(sink).toHaveBeenCalledTimes(3);
    expect(sink).toHaveBeenNthCalledWith(1, {
      name: "widget_expand",
      payload: { widget: "weekly-messages", dataset: "all", triggeredAt: timestamp },
    });
    expect(sink).toHaveBeenNthCalledWith(2, {
      name: "widget_close",
      payload: { widget: "weekly-messages", dataset: "all", triggeredAt: timestamp },
    });
    expect(sink).toHaveBeenNthCalledWith(3, {
      name: "widget_dwell",
      payload: { widget: "weekly-messages", dataset: "all", triggeredAt: timestamp, durationMs: 1234 },
    });
  });

  it("skips dispatch when analytics are disabled via env flag", () => {
    const sink = vi.fn();
    setAnalyticsSink(sink);
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = "false";

    trackDatasetChange({
      previous: null,
      next: "all",
      triggeredAt: "2025-01-03T08:30:00.000Z",
    });

    expect(sink).not.toHaveBeenCalled();
  });
});
