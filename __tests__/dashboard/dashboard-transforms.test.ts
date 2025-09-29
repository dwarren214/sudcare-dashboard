import { describe, expect, it } from "vitest";

import {
  buildHourlyHeatmap,
  formatParticipantId,
  getTopParticipants,
  normalizeWeeklyMessages,
  sortUserMessages,
  summarizeAssistantResponses,
} from "@/lib/dashboard-transforms";

describe("dashboard transforms", () => {
  it("normalizes weekly messages to the provided timeframe", () => {
    const normalized = normalizeWeeklyMessages(
      [
        { week: 1, messages: 10 },
        { week: 3, messages: 25 },
        { week: 12, messages: 40 },
      ],
      4,
    );

    expect(normalized).toEqual([
      { week: 1, messages: 10 },
      { week: 2, messages: 0 },
      { week: 3, messages: 25 },
      { week: 4, messages: 0 },
    ]);
  });

  it("sorts user messages descending by count with stable ordering", () => {
    const sorted = sortUserMessages([
      { participant: "p101", count: 20 },
      { participant: "p205", count: 35 },
      { participant: "p311", count: 35 },
      { participant: "p406", count: 2 },
    ]);

    expect(sorted.map((entry) => entry.participant)).toEqual(["p205", "p311", "p101", "p406"]);
  });

  it("returns the top participants up to the limit", () => {
    const top = getTopParticipants(
      [
        { participant: "p101", count: 20 },
        { participant: "p205", count: 35 },
        { participant: "p311", count: 35 },
        { participant: "p406", count: 2 },
      ],
      2,
    );

    expect(top).toHaveLength(2);
    expect(top.map((entry) => entry.participant)).toEqual(["p205", "p311"]);
  });

  it("formats long participant IDs with ellipsis", () => {
    expect(formatParticipantId("p123")).toBe("p123");
    expect(formatParticipantId("participant-123456")).toBe("partic…");
  });

  it("summarizes assistant responses with percentages", () => {
    const summary = summarizeAssistantResponses([
      { able: "TRUE", count: 120 },
      { able: "FALSE", count: 30 },
    ]);

    expect(summary.trueCount).toBe(120);
    expect(summary.falseCount).toBe(30);
    expect(summary.total).toBe(150);
    expect(summary.percentageTrue).toBe(80);
  });

  it("builds a 24-cell hourly heatmap filling missing hours with zero", () => {
    const cells = buildHourlyHeatmap([
      { hour: 0, count: 10 },
      { hour: 12, count: 25 },
      { hour: 23, count: 15 },
    ]);

    expect(cells).toHaveLength(24);
    expect(cells[0]).toEqual({ hour: 0, count: 10 });
    expect(cells[12]).toEqual({ hour: 12, count: 25 });
    expect(cells[23]).toEqual({ hour: 23, count: 15 });
    expect(cells[5]).toEqual({ hour: 5, count: 0 });
  });
});
