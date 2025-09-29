"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { DashboardData, DatasetKey } from "../../../types/dashboard";
import {
  DatasetLoadError,
  type DatasetLoadMeta,
  type DatasetLoadResult,
  loadDataset,
} from "@/lib/data-repository";

export type DatasetChangeEvent = "active-changed" | "loaded" | "error";

export interface DatasetChangePayload {
  dataset: DatasetKey;
  event: DatasetChangeEvent;
  meta?: DatasetLoadMeta;
  error?: string;
}

export type DatasetChangeListener = (payload: DatasetChangePayload) => void;

export type DatasetStatus = "idle" | "loading" | "success" | "error";

interface DatasetRecord {
  status: DatasetStatus;
  data?: DashboardData;
  meta?: DatasetLoadMeta;
  error?: string;
}

export interface DatasetOptionMeta {
  key: DatasetKey;
  label: string;
  description: string;
  lastUpdated?: string;
  loadedAt?: string;
}

interface DashboardDataContextValue {
  dataset: DatasetKey;
  datasetState: DatasetRecord;
  datasets: Record<DatasetKey, DatasetRecord>;
  setDataset: (dataset: DatasetKey) => void;
  toggleDataset: () => void;
  refreshDataset: () => Promise<void>;
  prefetchDataset: (dataset: DatasetKey) => Promise<void>;
  datasetOptions: DatasetOptionMeta[];
  addChangeListener: (listener: DatasetChangeListener) => () => void;
  removeChangeListener: (listener: DatasetChangeListener) => void;
}

interface DashboardDataProviderProps {
  children: ReactNode;
  initialDataset?: DatasetKey;
  initialResult?: DatasetLoadResult;
}

const DatasetKeys: DatasetKey[] = ["all", "exclude_p266"];

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

const defaultRecord: DatasetRecord = { status: "idle" };

export function DashboardDataProvider({
  children,
  initialDataset = "all",
  initialResult,
}: DashboardDataProviderProps) {
  const [activeDataset, setActiveDataset] = useState<DatasetKey>(initialDataset);
  const [datasets, setDatasets] = useState<Record<DatasetKey, DatasetRecord>>(() => {
    const base: Record<DatasetKey, DatasetRecord> = {
      all: { ...defaultRecord },
      exclude_p266: { ...defaultRecord },
    };

    if (initialResult) {
      base[initialResult.meta.dataset] = {
        status: "success",
        data: initialResult.data,
        meta: initialResult.meta,
      };
    }

    return base;
  });

  const inflightRequests = useRef<Partial<Record<DatasetKey, Promise<void>>>>({});
  const listenersRef = useRef<Set<DatasetChangeListener>>(new Set());

  const notifyListeners = useCallback(
    (payload: DatasetChangePayload) => {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- surfaced in development only for dataset instrumentation
        console.debug("[dashboard-data] event", payload);
      }
      listenersRef.current.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console -- surfaced in development only for dataset instrumentation
            console.warn("[dashboard-data] dataset listener failed", error);
          }
        }
      });
    },
    [],
  );

  const updateRecord = useCallback(
    (dataset: DatasetKey, updater: (current: DatasetRecord) => DatasetRecord) => {
      setDatasets((prev) => ({
        ...prev,
        [dataset]: updater(prev[dataset] ?? defaultRecord),
      }));
    },
    [],
  );

  const addChangeListener = useCallback((listener: DatasetChangeListener) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const removeChangeListener = useCallback((listener: DatasetChangeListener) => {
    listenersRef.current.delete(listener);
  }, []);

  const fetchDataset = useCallback(
    async (dataset: DatasetKey, { force = false }: { force?: boolean } = {}) => {
      if (inflightRequests.current[dataset]) {
        return inflightRequests.current[dataset];
      }

      let shouldFetch = force;
      setDatasets((prev) => {
        const current = prev[dataset] ?? defaultRecord;
        if (!force && (current.status === "loading" || current.status === "success")) {
          shouldFetch = false;
          return prev;
        }

        shouldFetch = true;
        return {
          ...prev,
          [dataset]: { status: "loading" },
        };
      });

      if (!shouldFetch) {
        return;
      }

      const request = (async () => {
        try {
          const result = await loadDataset(dataset);
          updateRecord(dataset, () => ({
            status: "success",
            data: result.data,
            meta: result.meta,
          }));
          notifyListeners({ dataset, event: "loaded", meta: result.meta });
        } catch (error: unknown) {
          if (error instanceof DatasetLoadError) {
            updateRecord(dataset, () => ({ status: "error", error: error.userMessage }));
            notifyListeners({ dataset, event: "error", error: error.userMessage });
            return;
          }
          const message = error instanceof Error ? error.message : "Unknown error loading dataset";
          updateRecord(dataset, () => ({ status: "error", error: message }));
          notifyListeners({ dataset, event: "error", error: message });
        } finally {
          inflightRequests.current[dataset] = undefined;
        }
      })();

      inflightRequests.current[dataset] = request;
      return request;
    },
    [notifyListeners, updateRecord],
  );

  const setDataset = useCallback(
    (dataset: DatasetKey) => {
      setActiveDataset(dataset);
      void fetchDataset(dataset);
    },
    [fetchDataset],
  );

  const toggleDataset = useCallback(() => {
    setActiveDataset((prev) => {
      const next = prev === "all" ? "exclude_p266" : "all";
      void fetchDataset(next);
      return next;
    });
  }, [fetchDataset]);

  const prefetchDataset = useCallback(
    async (dataset: DatasetKey) => {
      await fetchDataset(dataset).catch(() => undefined);
    },
    [fetchDataset],
  );

  useEffect(() => {
    // ensure active dataset is loaded when needed
    void fetchDataset(activeDataset);
  }, [activeDataset, fetchDataset]);

  useEffect(() => {
    const activeMeta = datasets[activeDataset]?.meta;
    notifyListeners({ dataset: activeDataset, event: "active-changed", meta: activeMeta });
  }, [activeDataset, datasets, notifyListeners]);

  const refreshDataset = useCallback(async () => {
    await fetchDataset(activeDataset, { force: true });
  }, [activeDataset, fetchDataset]);

  const contextValue = useMemo<DashboardDataContextValue>(() => {
    const datasetState = datasets[activeDataset] ?? defaultRecord;
    const datasetOptions: DatasetOptionMeta[] = DatasetKeys.map((key) => {
      const record = datasets[key];
      const label = key === "all" ? "All participants" : "Exclude p266";
      const description =
        key === "all"
          ? "Includes every participant in the study"
          : "Omits known outlier activity (participant p266)";

      return {
        key,
        label,
        description,
        lastUpdated: record?.data?.last_updated,
        loadedAt: record?.meta?.loadedAt,
      };
    });

    return {
      dataset: activeDataset,
      datasetState,
      datasets,
      setDataset,
      toggleDataset,
      refreshDataset,
      prefetchDataset,
      datasetOptions,
      addChangeListener,
      removeChangeListener,
    };
  }, [
    activeDataset,
    datasets,
    prefetchDataset,
    refreshDataset,
    setDataset,
    toggleDataset,
    addChangeListener,
    removeChangeListener,
  ]);

  return <DashboardDataContext.Provider value={contextValue}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardDataContext(): DashboardDataContextValue {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardDataContext must be used within a DashboardDataProvider");
  }
  return context;
}

export function useDashboardData() {
  const {
    dataset,
    datasetState,
    setDataset,
    toggleDataset,
    refreshDataset,
    prefetchDataset,
    datasetOptions,
    addChangeListener,
    removeChangeListener,
  } = useDashboardDataContext();
  const data = datasetState.data ?? null;
  const meta = datasetState.meta ?? null;
  const error = datasetState.error ?? null;
  const status = datasetState.status;

  return {
    dataset,
    data,
    meta,
    status,
    error,
    setDataset,
    toggleDataset,
    refreshDataset,
    prefetchDataset,
    datasetOptions,
    addChangeListener,
    removeChangeListener,
  };
}

export function useDatasetMeta() {
  const { datasetState } = useDashboardDataContext();
  return datasetState.meta ?? null;
}

export function useAllDatasets() {
  const { datasets } = useDashboardDataContext();
  return datasets;
}

export function useDashboardDataOptional() {
  return useContext(DashboardDataContext);
}

export function getDatasetKeys(): DatasetKey[] {
  return [...DatasetKeys];
}
