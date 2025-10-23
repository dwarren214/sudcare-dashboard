"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";

import { Container } from "@/components/layout/container";
import {
  buildParticipantFilterOptions,
  summarizeParticipantCohort,
  useDashboardDataOptional,
  type DatasetOptionMeta,
} from "@/components/dashboard/dashboard-data-provider";
import { ParticipantFilterControl } from "@/components/dashboard/participant-filter-control";
import { getCohortToneClasses } from "@/lib/cohort-style";
import { cn } from "@/lib/utils";

const FALLBACK_OPTION: DatasetOptionMeta = {
  key: "all",
  label: "All participants",
  description: "Includes every participant in the study.",
};

export function SiteHeader() {
  const context = useDashboardDataOptional();
  const datasetKey = context?.dataset ?? "all";
  const rawDatasetOptions = context?.datasetOptions;
  const datasetOptions = useMemo<DatasetOptionMeta[]>(() => {
    if (rawDatasetOptions && rawDatasetOptions.length > 0) {
      return rawDatasetOptions;
    }
    return [FALLBACK_OPTION];
  }, [rawDatasetOptions]);
  const datasetState = context?.datasetState ?? null;
  const datasetStatus = datasetState?.status ?? "idle";
  const activeOption =
    useMemo(
      () => datasetOptions.find((option) => option.key === datasetKey) ?? datasetOptions[0],
      [datasetKey, datasetOptions],
    ) ?? FALLBACK_OPTION;

  const normalized = datasetState?.normalized ?? null;
  const participantOptions = useMemo(() => buildParticipantFilterOptions(normalized), [normalized]);

  const cohortSummary = context
    ? summarizeParticipantCohort({
        mode: context.filterState.mode,
        selectedIds: context.filterState.selectedIds,
        participantOptions,
      })
    : summarizeParticipantCohort({
        mode: "include",
        selectedIds: [],
        participantOptions: [],
      });

  const toneClasses = getCohortToneClasses(cohortSummary.tone);
  const lastUpdatedLabel = formatLastUpdated(activeOption.lastUpdated ?? datasetState?.rawData?.last_updated);
  const loadedAtLabel = formatLoadedAt(activeOption.loadedAt ?? datasetState?.meta?.loadedAt);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 py-4 shadow-sm backdrop-blur">
      <Container className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">SUDCare Study</span>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/60 p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex max-w-3xl flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active cohort
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                    toneClasses.badge,
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", toneClasses.dot)} aria-hidden />
                  {cohortSummary.label}
                </span>
                {datasetStatus === "loading" ? (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Refreshing data…
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-slate-500">{cohortSummary.description}</p>
              <p className="text-xs text-slate-400">
                Last updated: <span className="font-medium text-slate-600">{lastUpdatedLabel}</span>
                {loadedAtLabel ? ` · Loaded ${loadedAtLabel}` : ""}
              </p>
              {activeOption.description ? (
                <p className="text-xs text-slate-400">{activeOption.description}</p>
              ) : null}
            </div>
            {context ? (
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <ParticipantFilterControl />
              </div>
            ) : null}
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
