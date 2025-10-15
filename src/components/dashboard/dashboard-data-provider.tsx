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

import type { DashboardData, DatasetKey, InteractionRecord, NormalizedDashboardDataset } from "../../../types/dashboard";
import {
  DatasetLoadError,
  type DatasetLoadMeta,
  type DatasetLoadResult,
  loadDataset,
} from "@/lib/data-repository";
import { buildDashboardDataFromNormalizedDataset } from "@/lib/dashboard-aggregator";
import { trackParticipantFilterChange } from "@/lib/analytics";

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
  rawData?: DashboardData;
  meta?: DatasetLoadMeta;
  error?: string;
  normalized?: NormalizedDashboardDataset | null;
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
  filterState: ParticipantFilterState;
  setFilterMode: (mode: ParticipantFilterMode) => void;
  setSelectedParticipants: (participants: string[]) => void;
  toggleParticipant: (participant: string) => void;
  clearFilter: () => void;
}

interface DashboardDataProviderProps {
  children: ReactNode;
  initialDataset?: DatasetKey;
  initialResult?: DatasetLoadResult;
}

const DatasetKeys: DatasetKey[] = ["all", "exclude_p266"];

const DashboardDataContext = createContext<DashboardDataContextValue | null>(null);

const defaultRecord: DatasetRecord = { status: "idle" };

export type ParticipantFilterMode = "include" | "exclude";

export interface ParticipantFilterState {
  mode: ParticipantFilterMode;
  selectedIds: string[];
}

export interface ParticipantFilterOption {
  id: string;
  label: string;
  messageCount: number;
}

function createDefaultFilterState(): ParticipantFilterState {
  return {
    mode: "include",
    selectedIds: [],
  };
}

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
        rawData: initialResult.data,
        meta: initialResult.meta,
        normalized: initialResult.normalized ?? null,
      };
    }

    return base;
  });

  const inflightRequests = useRef<Partial<Record<DatasetKey, Promise<void>>>>({});
  const listenersRef = useRef<Set<DatasetChangeListener>>(new Set());
  const [filterState, setFilterState] = useState<ParticipantFilterState>(() => createDefaultFilterState());
  const previousFilterRef = useRef(filterState);

  const setFilterMode = useCallback((mode: ParticipantFilterMode) => {
    setFilterState((prev) => {
      if (prev.mode === mode) {
        return prev;
      }
      return { ...prev, mode };
    });
  }, []);

  const setSelectedParticipants = useCallback((participants: string[]) => {
    setFilterState((prev) => {
      const unique = Array.from(new Set(participants.filter((participant) => participant.trim().length > 0)));
      if (unique.length === prev.selectedIds.length && unique.every((id, index) => id === prev.selectedIds[index])) {
        return prev;
      }
      return { ...prev, selectedIds: unique };
    });
  }, []);

  const toggleParticipant = useCallback((participant: string) => {
    setFilterState((prev) => {
      const id = participant.trim();
      if (!id) {
        return prev;
      }
      const exists = prev.selectedIds.includes(id);
      if (exists) {
        const nextIds = prev.selectedIds.filter((value) => value !== id);
        return { ...prev, selectedIds: nextIds };
      }
      return { ...prev, selectedIds: [...prev.selectedIds, id] };
    });
  }, []);

  const clearFilter = useCallback(() => {
    setFilterState((prev) => {
      if (prev.selectedIds.length === 0) {
        return prev;
      }
      return { ...prev, selectedIds: [] };
    });
  }, []);

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
            rawData: result.data,
            meta: result.meta,
            normalized: result.normalized ?? null,
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
    const record = datasets[activeDataset];
    const normalized = record?.normalized ?? null;

    if (!normalized) {
      setFilterState((prev) => {
        if (prev.selectedIds.length === 0) {
          return prev;
        }
        return { ...prev, selectedIds: [] };
      });
      previousFilterRef.current = filterState;
      return;
    }

    const validIds = new Set(
      normalized.participants.map((participant) => participant.participant),
    );

    setFilterState((prev) => {
      const filteredIds = prev.selectedIds.filter((id) => validIds.has(id));
      if (filteredIds.length === prev.selectedIds.length) {
        return prev;
      }
      return { ...prev, selectedIds: filteredIds };
    });
  }, [activeDataset, datasets, filterState]);

  useEffect(() => {
    const record = datasets[activeDataset];
    const normalized = record?.normalized ?? null;

    if (!normalized) {
      previousFilterRef.current = filterState;
      return;
    }

    const previous = previousFilterRef.current;
    const modeChanged = previous.mode !== filterState.mode;
    const selectionsEqual =
      previous.selectedIds.length === filterState.selectedIds.length &&
      previous.selectedIds.every((id, index) => id === filterState.selectedIds[index]);

    if (!modeChanged && selectionsEqual) {
      previousFilterRef.current = filterState;
      return;
    }

    let action: "mode" | "selection" | "clear" = "selection";
    if (filterState.selectedIds.length === 0 && previous.selectedIds.length > 0) {
      action = "clear";
    } else if (modeChanged) {
      action = "mode";
    }

    trackParticipantFilterChange({
      dataset: activeDataset,
      mode: filterState.mode,
      selectedIds: filterState.selectedIds,
      selectedCount: filterState.selectedIds.length,
      action,
      triggeredAt: new Date().toISOString(),
    });

    previousFilterRef.current = filterState;
  }, [activeDataset, datasets, filterState]);

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
        lastUpdated: record?.rawData?.last_updated,
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
      filterState,
      setFilterMode,
      setSelectedParticipants,
      toggleParticipant,
      clearFilter,
    };
  }, [
    activeDataset,
    datasets,
    filterState,
    prefetchDataset,
    refreshDataset,
    setDataset,
    toggleDataset,
    setFilterMode,
    setSelectedParticipants,
    toggleParticipant,
    clearFilter,
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
    filterState,
    setFilterMode,
    setSelectedParticipants,
    toggleParticipant,
    clearFilter,
  } = useDashboardDataContext();
  const rawData = datasetState.rawData ?? null;
  const meta = datasetState.meta ?? null;
  const error = datasetState.error ?? null;
  const status = datasetState.status;
  const normalized = datasetState.normalized ?? null;

  const participantOptions = useMemo<ParticipantFilterOption[]>(() => {
    if (!normalized) {
      return [];
    }

    return [...normalized.participants]
      .map((participant) => ({
        id: participant.participant,
        label: participant.participant,
        messageCount: participant.message_count,
      }))
      .sort((a, b) => {
        if (b.messageCount === a.messageCount) {
          return a.id.localeCompare(b.id);
        }
      return b.messageCount - a.messageCount;
    });
  }, [normalized]);

  const filteredData = useMemo(() => computeFilteredDataset(dataset, datasetState, filterState), [
    dataset,
    datasetState,
    filterState,
  ]);

  const data = filteredData?.dashboard ?? rawData ?? null;
  const interactions = filteredData?.interactions ?? normalized?.interactions ?? [];
  const activeNormalized = filteredData?.normalized ?? normalized;
  const isFilterEnabled = Boolean(normalized);
  const optionSet = useMemo(() => new Set(participantOptions.map((option) => option.id)), [participantOptions]);
  const selectedIds = filterState.selectedIds.filter((id) => optionSet.has(id));
  const isFilterActive = isFilterEnabled && selectedIds.length > 0;

  return {
    dataset,
    data,
    rawData,
    meta,
    normalized: activeNormalized,
    interactions,
    status,
    error,
    setDataset,
    toggleDataset,
    refreshDataset,
    prefetchDataset,
    datasetOptions,
    addChangeListener,
    removeChangeListener,
    participantFilter: {
      mode: filterState.mode,
      selectedIds,
      isActive: isFilterActive,
      isEnabled: isFilterEnabled,
      options: participantOptions,
      setMode: setFilterMode,
      setSelectedIds: setSelectedParticipants,
      toggleParticipant,
      clear: clearFilter,
    },
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

interface FilteredDatasetResult {
  dashboard: DashboardData;
  interactions: InteractionRecord[];
  normalized: NormalizedDashboardDataset | null;
}

function computeFilteredDataset(
  datasetKey: DatasetKey,
  record: DatasetRecord,
  filter: ParticipantFilterState,
): FilteredDatasetResult | null {
  const rawData = record.rawData ?? null;
  if (!rawData) {
    return null;
  }

  const normalized = record.normalized ?? null;
  if (!normalized) {
    return {
      dashboard: rawData,
      interactions: [],
      normalized: null,
    };
  }

  if (filter.selectedIds.length === 0) {
    return {
      dashboard: rawData,
      interactions: normalized.interactions,
      normalized,
    };
  }

  const availableIds = new Set(
    normalized.participants.map((participant) => participant.participant),
  );
  const selectedIds = filter.selectedIds.filter((id) => availableIds.has(id));

  if (selectedIds.length === 0) {
    return {
      dashboard: rawData,
      interactions: normalized.interactions,
      normalized,
    };
  }

  const selectedSet = new Set(selectedIds);
  const filteredInteractions = normalized.interactions.filter((interaction) => {
    const participantId = interaction.participant ?? "";
    const isSelected = selectedSet.has(participantId);
    return filter.mode === "include" ? isSelected : !isSelected;
  });

  const normalizedInput: NormalizedDashboardDataset = {
    ...normalized,
    interactions: filteredInteractions,
    meta: {
      ...normalized.meta,
      record_count: filteredInteractions.length,
    },
  };

  const { dashboard } = buildDashboardDataFromNormalizedDataset(normalizedInput, {
    datasetKey,
    fallbackLastUpdated: rawData.last_updated,
  });

  return {
    dashboard,
    interactions: filteredInteractions,
    normalized: normalizedInput,
  };
}

export function getDatasetKeys(): DatasetKey[] {
  return [...DatasetKeys];
}
