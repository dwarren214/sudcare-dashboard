import { describe, expect, it } from "vitest";

import { buildDashboardDataFromNormalizedDataset } from "../../src/lib/dashboard-aggregator";
import type { NormalizedDashboardDataset } from "../../types/dashboard";

describe("dashboard-aggregator", () => {
  it("builds dashboard metrics from normalized dataset interactions", () => {
    const dataset: NormalizedDashboardDataset = {
      meta: {
        dataset: "test_all",
        generated_at: "2025-01-05T12:00:00Z",
        source_workbook: "docs/source.xlsx",
        record_count: 3,
        last_updated: null,
      },
      interactions: [
        {
          message_id: "1",
          participant: "p1",
          message_date: "2025-01-01",
          message_time_fraction: 0.25,
          occurred_at: "2025-01-01T06:00:00",
          day_of_week: "Monday",
          category: "wellness",
          subcategory: "support",
          category_justification: null,
          satisfied: true,
          satisfaction_justification: null,
          registration_date: "2024-12-30",
          study_week: 1,
          response_latency_seconds: 10,
          emergency_response: false,
          input_cost: 0.12,
          output_cost: 0.09,
          total_cost: 0.21,
        },
        {
          message_id: "2",
          participant: "p2",
          message_date: "2025-01-02",
          message_time_fraction: 0.75,
          occurred_at: "2025-01-02T18:00:00",
          day_of_week: "Tuesday",
          category: "other",
          subcategory: "info",
          category_justification: null,
          satisfied: false,
          satisfaction_justification: null,
          registration_date: "2024-12-30",
          study_week: 2,
          response_latency_seconds: 22,
          emergency_response: false,
          input_cost: 0.08,
          output_cost: 0.07,
          total_cost: 0.15,
        },
        {
          message_id: "3",
          participant: "p1",
          message_date: "2025-01-02",
          message_time_fraction: 0.9,
          occurred_at: "2025-01-02T21:00:00",
          day_of_week: "Wednesday",
          category: "",
          subcategory: null,
          category_justification: null,
          satisfied: null,
          satisfaction_justification: null,
          registration_date: "2024-12-30",
          study_week: 2,
          response_latency_seconds: 18,
          emergency_response: false,
          input_cost: 0.05,
          output_cost: 0.05,
          total_cost: 0.1,
        },
      ],
      participants: [
        {
          participant: "p1",
          message_count: 2,
          first_message_at: "2025-01-01T06:00:00",
          last_message_at: "2025-01-02T21:00:00",
          total_input_cost: 0.17,
          total_output_cost: 0.14,
          total_cost: 0.31,
        },
        {
          participant: "p2",
          message_count: 1,
          first_message_at: "2025-01-02T18:00:00",
          last_message_at: "2025-01-02T18:00:00",
          total_input_cost: 0.08,
          total_output_cost: 0.07,
          total_cost: 0.15,
        },
      ],
    };

    const { dashboard } = buildDashboardDataFromNormalizedDataset(dataset, {
      datasetKey: "all",
    });

    expect(dashboard.dataset).toBe("all");
    expect(dashboard.last_updated).toBe("2025-01-02");

    expect(dashboard.metrics.weekly_messages).toEqual([
      { week: 1, messages: 1 },
      { week: 2, messages: 2 },
    ]);

    expect(dashboard.metrics.messages_by_user).toEqual([
      { participant: "p1", count: 2 },
      { participant: "p2", count: 1 },
    ]);

    expect(dashboard.metrics.categories).toEqual([
      { name: "other", count: 1 },
      { name: "Uncategorized", count: 1 },
      { name: "wellness", count: 1 },
    ]);

    expect(dashboard.metrics.subcategories).toEqual([
      { name: "info", count: 1 },
      { name: "support", count: 1 },
    ]);

    expect(dashboard.metrics.suzy_can_respond).toEqual([
      { able: "TRUE", count: 1 },
      { able: "FALSE", count: 1 },
    ]);

    const hourCounts = dashboard.metrics.message_times.filter((entry) => entry.count > 0);
    expect(hourCounts).toEqual([
      { hour: 6, count: 1 },
      { hour: 18, count: 1 },
      { hour: 21, count: 1 },
    ]);

    expect(dashboard.metrics.message_times_by_day).toEqual([
      { day: "Monday", hour: 6, count: 1 },
      { day: "Tuesday", hour: 18, count: 1 },
      { day: "Wednesday", hour: 21, count: 1 },
    ]);
  });
});
