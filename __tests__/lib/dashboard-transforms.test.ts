import { describe, expect, it } from "vitest";

import { buildIntentNotMetBreakdown } from "@/lib/dashboard-transforms";
import type { InteractionRecord } from "../../types/dashboard";

describe("buildIntentNotMetBreakdown", () => {
  const interactions: InteractionRecord[] = [
    {
      message_id: "1",
      participant: "p1",
      message_date: "2024-05-01",
      message_time_fraction: 0.5,
      occurred_at: "2024-05-01T12:00:00",
      day_of_week: "Wednesday",
      category: "support",
      subcategory: "check-in",
      category_justification: null,
      satisfied: true,
      satisfaction_justification: null,
      registration_date: "2024-04-01",
      study_week: 1,
      response_latency_seconds: 10,
      emergency_response: false,
      input_cost: 0.01,
      output_cost: 0.01,
      total_cost: 0.02,
    },
    {
      message_id: "2",
      participant: "p2",
      message_date: "2024-05-02",
      message_time_fraction: 0.25,
      occurred_at: "2024-05-02T06:00:00",
      day_of_week: "Thursday",
      category: "resources",
      subcategory: "hotline",
      category_justification: null,
      satisfied: false,
      satisfaction_justification: null,
      registration_date: "2024-04-02",
      study_week: 1,
      response_latency_seconds: 15,
      emergency_response: false,
      input_cost: 0.02,
      output_cost: 0.02,
      total_cost: 0.04,
    },
    {
      message_id: "3",
      participant: "p3",
      message_date: "2024-05-03",
      message_time_fraction: 0.75,
      occurred_at: "2024-05-03T18:00:00",
      day_of_week: "Friday",
      category: "resources",
      subcategory: "information",
      category_justification: null,
      satisfied: false,
      satisfaction_justification: null,
      registration_date: "2024-04-03",
      study_week: 1,
      response_latency_seconds: 20,
      emergency_response: false,
      input_cost: 0.03,
      output_cost: 0.03,
      total_cost: 0.06,
    },
    {
      message_id: "4",
      participant: "p4",
      message_date: "2024-05-04",
      message_time_fraction: 0.1,
      occurred_at: "2024-05-04T02:24:00",
      day_of_week: "Saturday",
      category: "",
      subcategory: "",
      category_justification: null,
      satisfied: false,
      satisfaction_justification: null,
      registration_date: "2024-04-04",
      study_week: 1,
      response_latency_seconds: 30,
      emergency_response: false,
      input_cost: 0.01,
      output_cost: 0.01,
      total_cost: 0.02,
    },
  ];

  it("summarizes categories and subcategories for unsatisfied interactions", () => {
    const breakdown = buildIntentNotMetBreakdown(interactions);

    expect(breakdown.total).toBe(3);
    expect(breakdown.categories).toEqual([
      { name: "resources", count: 2 },
      { name: "Uncategorized", count: 1 },
    ]);
    expect(breakdown.subcategories).toEqual([
      { name: "hotline", count: 1 },
      { name: "information", count: 1 },
      { name: "Unspecified", count: 1 },
    ]);
  });

  it("returns empty breakdown when all intents are met", () => {
    const breakdown = buildIntentNotMetBreakdown(
      interactions.map((interaction) => ({ ...interaction, satisfied: true }))
    );

    expect(breakdown.total).toBe(0);
    expect(breakdown.categories).toHaveLength(0);
    expect(breakdown.subcategories).toHaveLength(0);
  });
});
