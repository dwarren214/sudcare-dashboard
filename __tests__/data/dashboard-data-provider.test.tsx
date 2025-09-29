import React, { act, type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  DashboardDataProvider,
  useDashboardData,
} from "@/components/dashboard/dashboard-data-provider";
import type { DashboardData } from "../../../types/dashboard";
import {
  DatasetLoadError,
  type DatasetLoadResult,
  loadDataset as loadDatasetActual,
} from "@/lib/data-repository";

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
});

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
});
