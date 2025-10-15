import React, { act, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  DashboardDataProvider,
  useDashboardData,
} from "@/components/dashboard/dashboard-data-provider";
import type { DashboardData, NormalizedDashboardDataset } from "../../../types/dashboard";
import {
  DatasetLoadError,
  type DatasetLoadResult,
  loadDataset as loadDatasetActual,
} from "@/lib/data-repository";
import { buildDashboardDataFromNormalizedDataset } from "@/lib/dashboard-aggregator";

vi.mock("@/lib/data-repository", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data-repository")>("@/lib/data-repository");
  return {
    ...actual,
    loadDataset: vi.fn(),
  };
});

const loadDataset = vi.mocked(loadDatasetActual);

const flushPromises = () => new Promise((resolve) => queueMicrotask(resolve));

const buildDataset = (dataset: "all" | "exclude_p266"): DashboardData => ({
  dataset,
  last_updated: "2024-05-15",
  metrics: {
    weekly_messages: [
      { week: 1, messages: dataset === "all" ? 120 : 95 },
      { week: 2, messages: dataset === "all" ? 136 : 112 },
    ],
    messages_by_user: [
      { participant: "p101", count: 45 },
      { participant: "p137", count: 38 },
    ],
    categories: [
      { name: "support", count: 78 },
    ],
    subcategories: [
      { name: "check-in", count: 36 },
    ],
    suzy_can_respond: [
      { able: "TRUE", count: 135 },
      { able: "FALSE", count: 27 },
    ],
    message_times: [
      { hour: 9, count: 40 },
      { hour: 12, count: 52 },
    ],
    message_times_by_day: [
      { day: "Monday", hour: 9, count: 10 },
      { day: "Tuesday", hour: 12, count: 15 },
    ],
  },
});

const buildResult = (dataset: "all" | "exclude_p266"): DatasetLoadResult => ({
  data: buildDataset(dataset),
  meta: {
    dataset,
    source: "filesystem",
    sourcePath: `/data-${dataset}.json`,
    loadedAt: new Date("2024-05-15T12:00:00Z").toISOString(),
  },
  normalized: null,
});

const buildNormalizedFixture = (): NormalizedDashboardDataset => ({
  meta: {
    dataset: "all",
    generated_at: "2024-05-15T12:00:00Z",
    source_workbook: "test.xlsx",
    record_count: 3,
    last_updated: "2024-05-13",
  },
  interactions: [
    {
      message_id: "1",
      participant: "p101",
      message_date: "2024-05-10",
      message_time_fraction: 0.375,
      occurred_at: "2024-05-10T09:00:00",
      day_of_week: "Friday",
      category: "support",
      subcategory: "check-in",
      category_justification: null,
      satisfied: true,
      satisfaction_justification: null,
      registration_date: "2024-04-01",
      study_week: 1,
      response_latency_seconds: 12,
      emergency_response: false,
      input_cost: 0.01,
      output_cost: 0.01,
      total_cost: 0.02,
    },
    {
      message_id: "2",
      participant: "p137",
      message_date: "2024-05-12",
      message_time_fraction: 0.5,
      occurred_at: "2024-05-12T12:00:00",
      day_of_week: "Sunday",
      category: "support",
      subcategory: "resources",
      category_justification: null,
      satisfied: false,
      satisfaction_justification: null,
      registration_date: "2024-04-03",
      study_week: 2,
      response_latency_seconds: 18,
      emergency_response: false,
      input_cost: 0.02,
      output_cost: 0.02,
      total_cost: 0.04,
    },
    {
      message_id: "3",
      participant: "p101",
      message_date: "2024-05-13",
      message_time_fraction: 0.75,
      occurred_at: "2024-05-13T18:00:00",
      day_of_week: "Monday",
      category: "wellness",
      subcategory: "check-in",
      category_justification: null,
      satisfied: true,
      satisfaction_justification: null,
      registration_date: "2024-04-01",
      study_week: 2,
      response_latency_seconds: 9,
      emergency_response: false,
      input_cost: 0.01,
      output_cost: 0.01,
      total_cost: 0.02,
    },
  ],
  participants: [
    {
      participant: "p101",
      message_count: 2,
      first_message_at: "2024-05-10T09:00:00",
      last_message_at: "2024-05-13T18:00:00",
      total_input_cost: 0.02,
      total_output_cost: 0.02,
      total_cost: 0.04,
    },
    {
      participant: "p137",
      message_count: 1,
      first_message_at: "2024-05-12T12:00:00",
      last_message_at: "2024-05-12T12:00:00",
      total_input_cost: 0.02,
      total_output_cost: 0.02,
      total_cost: 0.04,
    },
  ],
});

const buildNormalizedResult = (): DatasetLoadResult => {
  const normalized = buildNormalizedFixture();
  const { dashboard } = buildDashboardDataFromNormalizedDataset(normalized, {
    datasetKey: "all",
    fallbackLastUpdated: normalized.meta.last_updated ?? "2024-05-13",
  });

  return {
    data: dashboard,
    meta: {
      dataset: "all",
      source: "filesystem",
      sourcePath: "/data-all.json",
      loadedAt: new Date("2024-05-15T12:00:00Z").toISOString(),
    },
    normalized,
  };
};

describe("DashboardDataProvider", () => {
  beforeEach(() => {
    loadDataset.mockReset();
  });

  it("exposes initial dataset data when provided", () => {
    const initialResult = buildResult("all");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardDataProvider initialDataset="all" initialResult={initialResult}>
        {children}
      </DashboardDataProvider>
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    expect(result.current.dataset).toBe("all");
    expect(result.current.status).toBe("success");
    expect(result.current.data).toEqual(initialResult.data);
    expect(result.current.interactions).toEqual([]);
    expect(result.current.datasetOptions).toHaveLength(2);
    const allOption = result.current.datasetOptions.find((option) => option.key === "all");
    expect(allOption?.label).toBe("All participants");
    expect(allOption?.lastUpdated).toBe("2024-05-15");
  });

  it("loads datasets on demand and caches results", async () => {
    loadDataset
      .mockResolvedValueOnce(buildResult("all"))
      .mockResolvedValueOnce(buildResult("exclude_p266"));

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardDataProvider initialDataset="all">{children}</DashboardDataProvider>
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(loadDataset).toHaveBeenCalledTimes(1);
    expect(result.current.data?.dataset).toBe("all");
    expect(result.current.interactions).toEqual([]);

    await act(async () => {
      result.current.setDataset("exclude_p266");
      await flushPromises();
    });

    await waitFor(() => expect(result.current.dataset).toBe("exclude_p266"));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data?.dataset).toBe("exclude_p266");
    expect(loadDataset).toHaveBeenCalledTimes(2);

    await act(async () => {
      result.current.setDataset("all");
      await flushPromises();
    });

    await waitFor(() => expect(result.current.dataset).toBe("all"));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data?.dataset).toBe("all");
    expect(result.current.interactions).toEqual([]);
    expect(loadDataset).toHaveBeenCalledTimes(2);
  });

  it("emits dataset change events with metadata", async () => {
    const initialResult = buildResult("all");
    loadDataset.mockResolvedValueOnce(buildResult("exclude_p266"));

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardDataProvider initialDataset="all" initialResult={initialResult}>
        {children}
      </DashboardDataProvider>
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });
    const events: Array<{ event: string; dataset: string }> = [];

    let unsubscribe: (() => void) | undefined;
    act(() => {
      unsubscribe = result.current.addChangeListener((payload) => {
        events.push({ event: payload.event, dataset: payload.dataset });
      });
    });

    await act(async () => {
      result.current.setDataset("exclude_p266");
      await flushPromises();
    });

    await waitFor(() => expect(result.current.dataset).toBe("exclude_p266"));
    await waitFor(() => expect(result.current.status).toBe("success"));

    await waitFor(() => {
      expect(events.some((entry) => entry.event === "loaded" && entry.dataset === "exclude_p266")).toBe(true);
    });

    const option = result.current.datasetOptions.find((item) => item.key === "exclude_p266");
    expect(option?.lastUpdated).toBe("2024-05-15");
    expect(option?.loadedAt).toBeDefined();

    act(() => {
      unsubscribe?.();
    });
  });

  it("captures dataset errors with helpful messaging", async () => {
    const datasetError = new DatasetLoadError("all", "Failed", {
      source: "api",
      userMessage: "Data unavailable",
    });
    loadDataset.mockRejectedValueOnce(datasetError);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardDataProvider initialDataset="all">{children}</DashboardDataProvider>
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe("Data unavailable");
  });

  it("filters dataset metrics when participant selection changes", async () => {
    const normalizedResult = buildNormalizedResult();
    loadDataset.mockResolvedValueOnce(normalizedResult);

    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardDataProvider initialDataset="all">{children}</DashboardDataProvider>
    );

    const { result } = renderHook(() => useDashboardData(), { wrapper });

    await waitFor(() => expect(result.current.status).toBe("success"));

    expect(result.current.participantFilter?.options).toHaveLength(2);
    expect(result.current.interactions).toHaveLength(3);

    act(() => {
      result.current.participantFilter?.setMode("include");
      result.current.participantFilter?.setSelectedIds(["p101"]);
    });

    await waitFor(() => {
      expect(result.current.data?.metrics.messages_by_user).toEqual([
        { participant: "p101", count: 2 },
      ]);
      expect(result.current.interactions).toHaveLength(2);
    });

    act(() => {
      result.current.participantFilter?.setMode("exclude");
      result.current.participantFilter?.setSelectedIds(["p101"]);
    });

    await waitFor(() => {
      expect(result.current.data?.metrics.messages_by_user).toEqual([
        { participant: "p137", count: 1 },
      ]);
      expect(result.current.interactions).toHaveLength(1);
    });

    act(() => {
      result.current.participantFilter?.clear();
    });

    await waitFor(() => {
      expect(result.current.interactions).toHaveLength(3);
      const counts = result.current.data?.metrics.messages_by_user.map((entry) => entry.count);
      expect(counts).toEqual([2, 1]);
    });
  });
});
