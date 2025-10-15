"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Loader2 } from "lucide-react";

import { Container } from "@/components/layout/container";
import {
  useDashboardDataOptional,
  type DatasetOptionMeta,
} from "@/components/dashboard/dashboard-data-provider";
import { ParticipantFilterControl } from "@/components/dashboard/participant-filter-control";
import { cn } from "@/lib/utils";
import type { DatasetKey } from "../../../types/dashboard";

interface SiteHeaderProps {
  dataset?: DatasetKey;
  onToggleDataset?: () => void;
  onDatasetChange?: (dataset: DatasetKey) => void;
}

const FALLBACK_OPTIONS: DatasetOptionMeta[] = [
  {
    key: "all",
    label: "All participants",
    description: "Includes every participant in the study",
  },
  {
    key: "exclude_p266",
    label: "Exclude p266",
    description: "Omits known outlier activity (participant p266)",
  },
];

export function SiteHeader({
  dataset: controlledDataset,
  onToggleDataset,
  onDatasetChange,
}: SiteHeaderProps) {
  const context = useDashboardDataOptional();
  const [localDataset, setLocalDataset] = useState<DatasetKey>("all");
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const dataset = controlledDataset ?? context?.dataset ?? localDataset;
  const datasetOptions = context?.datasetOptions ?? FALLBACK_OPTIONS;
  const isDatasetLoading = context?.datasetState.status === "loading";

  const activeOption = useMemo(() => {
    return datasetOptions.find((option) => option.key === dataset) ?? FALLBACK_OPTIONS[0];
  }, [dataset, datasetOptions]);

  const lastUpdatedLabel = formatLastUpdated(activeOption.lastUpdated);
  const loadedAtLabel = formatLoadedAt(activeOption.loadedAt);

  const selectDataset = (next: DatasetKey) => {
    if (next === dataset) {
      return;
    }

    if (context) {
      context.setDataset(next);
      return;
    }

    if (controlledDataset !== undefined) {
      if (onDatasetChange) {
        onDatasetChange(next);
        return;
      }
      onToggleDataset?.();
      return;
    }

    setLocalDataset(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (isDatasetLoading) {
      event.preventDefault();
      return;
    }

    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"] as const;
    if (!keys.includes(event.key as (typeof keys)[number])) {
      return;
    }

    event.preventDefault();
    const lastIndex = datasetOptions.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowLeft") {
      nextIndex = index === 0 ? lastIndex : index - 1;
    } else if (event.key === "ArrowRight") {
      nextIndex = index === lastIndex ? 0 : index + 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }

    const nextKey = datasetOptions[nextIndex]?.key;
    if (nextKey) {
      selectDataset(nextKey);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 py-4 shadow-sm backdrop-blur">
      <Container className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">SUDCare Study</span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Dataset selection
            </span>
            <div
              role="radiogroup"
              aria-label="Dataset selection"
              className="inline-flex flex-wrap items-center gap-2"
            >
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white">
                {datasetOptions.map((option, index) => {
                  const isActive = option.key === dataset;
                  return (
                    <button
                      key={option.key}
                      ref={(node) => {
                        buttonRefs.current[index] = node;
                      }}
                      type="button"
                      role="radio"
                      tabIndex={isActive ? 0 : -1}
                      aria-checked={isActive}
                      aria-label={option.label}
                      disabled={isDatasetLoading}
                      onClick={() => selectDataset(option.key)}
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      className={cn(
                        "flex min-w-[140px] flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60",
                        isActive
                          ? "bg-brand-600 text-white shadow-inner"
                          : "bg-white text-slate-600 hover:bg-slate-100",
                        isDatasetLoading ? "cursor-not-allowed opacity-70" : "",
                      )}
                    >
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              {isDatasetLoading ? (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Switching dataset…
                </span>
              ) : null}
            </div>
            {context ? (
              <div className="mt-1">
                <ParticipantFilterControl />
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{activeOption.label}</span>
            <span>{activeOption.description}</span>
            <span>
              Last updated: <span className="font-medium text-slate-600">{lastUpdatedLabel}</span>
              {loadedAtLabel ? ` · Loaded ${loadedAtLabel}` : ""}
            </span>
          </div>
        </div>
      </Container>
    </header>
  );
}

function formatLastUpdated(timestamp?: string) {
  if (!timestamp) {
    return "--";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatLoadedAt(timestamp?: string) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
