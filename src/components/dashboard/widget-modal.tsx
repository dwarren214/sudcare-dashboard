"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getCohortToneClasses } from "@/lib/cohort-style";
import { cn } from "@/lib/utils";
import { downloadBlob, downloadText } from "@/lib/downloads";
import { exportElementToPng } from "@/lib/export-image";
import { trackWidgetExport } from "@/lib/analytics";
import type { CohortBadgeTone, ParticipantFilterMode } from "@/components/dashboard/dashboard-data-provider";
import type { DatasetKey } from "../../../types/dashboard";

export interface WidgetModalExportConfig {
  widgetKey: string;
  dataset: DatasetKey;
  cohortMode: "all" | ParticipantFilterMode;
  selectedParticipantIds: string[];
  buildCsv?: () => Promise<string>;
}

type ExportKind = "png" | "csv";
type ExportStatus = "idle" | "pending";

interface ExportState {
  png: ExportStatus;
  csv: ExportStatus;
}

interface ToastState {
  message: string;
  tone: "success" | "error";
}

interface WidgetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  cohortLabel: string;
  cohortTone?: CohortBadgeTone;
  cohortDescription?: string;
  lastUpdated?: string;
  loadedAt?: string | null;
  children: ReactNode;
  footer?: ReactNode;
  insights?: ReactNode;
  exportConfig?: WidgetModalExportConfig;
}

export function WidgetModal({
  open,
  onOpenChange,
  title,
  description,
  cohortLabel,
  cohortTone = "all",
  cohortDescription,
  lastUpdated,
  loadedAt,
  children,
  footer,
  insights,
  exportConfig,
}: WidgetModalProps) {
  const timestampLabel = buildTimestampLabel({ lastUpdated, loadedAt });
  const toneStyles = getCohortToneClasses(cohortTone);
  const exportsEnabled = useMemo(() => isExportEnabled(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const pngButtonRef = useRef<HTMLButtonElement>(null);
  const csvButtonRef = useRef<HTMLButtonElement>(null);
  const toastRef = useRef<number | null>(null);
  const [exportState, setExportState] = useState<ExportState>({
    png: "idle",
    csv: "idle",
  });
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => () => {
    if (toastRef.current !== null) {
      window.clearTimeout(toastRef.current);
    }
  }, []);

  const showToast = useCallback((payload: ToastState) => {
    setToast(payload);
    if (toastRef.current !== null) {
      window.clearTimeout(toastRef.current);
    }
    toastRef.current = window.setTimeout(() => {
      setToast(null);
      toastRef.current = null;
    }, 4000);
  }, []);

  const handleSnapshotDownload = useCallback(async () => {
    if (!exportConfig) {
      return;
    }
    if (!exportsEnabled) {
      showToast({ message: "Snapshot exports are disabled for this environment.", tone: "error" });
      trackWidgetExport(buildExportEventPayload(exportConfig, "png", "error", "exports-disabled"));
      return;
    }

    const target = containerRef.current;
    if (!target) {
      showToast({ message: "We couldn't find the widget content to export.", tone: "error" });
      trackWidgetExport(buildExportEventPayload(exportConfig, "png", "error", "missing-target"));
      return;
    }

    const startedAt = now();
    setExportState((previous) => ({ ...previous, png: "pending" }));

    try {
      const blob = await exportElementToPng(target, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const filename = buildDownloadFilename(exportConfig.widgetKey, cohortLabel, "png");
      downloadBlob(blob, filename);

      trackWidgetExport(buildExportEventPayload(exportConfig, "png", "success", undefined, elapsed(startedAt)));
      showToast({ message: "Snapshot downloaded.", tone: "success" });
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      // eslint-disable-next-line no-console -- surfaced for debugging export issues
      console.error("[widget-export] snapshot failed", error);
      trackWidgetExport(buildExportEventPayload(exportConfig, "png", "error", errorMessage, elapsed(startedAt)));
      showToast({ message: "We couldn't export the snapshot. Try again.", tone: "error" });
    } finally {
      setExportState((previous) => ({ ...previous, png: "idle" }));
      pngButtonRef.current?.focus();
    }
  }, [cohortLabel, exportConfig, exportsEnabled, showToast]);

  const handleCsvDownload = useCallback(async () => {
    if (!exportConfig) {
      return;
    }
    if (!exportsEnabled) {
      showToast({ message: "CSV exports are disabled for this environment.", tone: "error" });
      trackWidgetExport(buildExportEventPayload(exportConfig, "csv", "error", "exports-disabled"));
      return;
    }
    if (!exportConfig.buildCsv) {
      showToast({ message: "CSV export is unavailable for this widget.", tone: "error" });
      trackWidgetExport(buildExportEventPayload(exportConfig, "csv", "error", "csv-unavailable"));
      return;
    }

    const startedAt = now();
    setExportState((previous) => ({ ...previous, csv: "pending" }));

    try {
      const csvContent = await exportConfig.buildCsv();
      const filename = buildDownloadFilename(exportConfig.widgetKey, cohortLabel, "csv");
      downloadCsv(csvContent, filename);

      trackWidgetExport(buildExportEventPayload(exportConfig, "csv", "success", undefined, elapsed(startedAt)));
      showToast({ message: "CSV downloaded.", tone: "success" });
    } catch (error) {
      const errorMessage = toErrorMessage(error);
      // eslint-disable-next-line no-console -- surfaced for debugging export issues
      console.error("[widget-export] csv failed", error);
      trackWidgetExport(buildExportEventPayload(exportConfig, "csv", "error", errorMessage, elapsed(startedAt)));
      showToast({ message: "We couldn't export the CSV. Try again.", tone: "error" });
    } finally {
      setExportState((previous) => ({ ...previous, csv: "idle" }));
      csvButtonRef.current?.focus();
    }
  }, [cohortLabel, exportConfig, exportsEnabled, showToast]);

  const exportFooter = footer ?? (
    exportConfig ? (
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-700">Export this widget</p>
          <p className="text-xs text-slate-400">
            {exportsEnabled
              ? "Downloads include the current filters and cohort metadata."
              : "Exports are disabled by the NEXT_PUBLIC_ENABLE_EXPORTS flag."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            ref={pngButtonRef}
            variant="outline"
            onClick={handleSnapshotDownload}
            disabled={exportState.png === "pending" || !exportsEnabled}
            aria-busy={exportState.png === "pending"}
          >
            {exportState.png === "pending" ? <LoadingSpinner className="mr-2" /> : null}
            Download snapshot
          </Button>
          <Button
            ref={csvButtonRef}
            variant="outline"
            onClick={handleCsvDownload}
            disabled={exportState.csv === "pending" || !exportsEnabled || !exportConfig.buildCsv}
            aria-busy={exportState.csv === "pending"}
          >
            {exportState.csv === "pending" ? <LoadingSpinner className="mr-2" /> : null}
            Download CSV
          </Button>
        </div>
      </div>
    ) : (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-700">Exports unavailable</p>
          <p className="text-xs text-slate-400">
            This widget does not expose export controls.
          </p>
        </div>
        <Button variant="outline" disabled className="border-dashed">
          Exports disabled
        </Button>
      </div>
    )
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] w-full max-w-5xl overflow-hidden border-none bg-white p-0 shadow-2xl",
        )}
      >
        {toast ? (
          <div
            className={cn(
              "pointer-events-none absolute right-6 top-6 max-w-xs rounded-lg border px-4 py-3 text-sm shadow-lg",
              toast.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            )}
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
          >
            {toast.message}
          </div>
        ) : null}
        <div className="flex h-full flex-col">
          <DialogHeader className="space-y-3 border-b border-slate-200 bg-white px-6 py-5 text-left">
            <DialogTitle className="text-2xl font-semibold text-slate-900">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-sm text-slate-500">{description}</DialogDescription>
            ) : null}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span
                className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium", toneStyles.badge)}
              >
                <span className={cn("h-2 w-2 rounded-full", toneStyles.dot)} aria-hidden />
                {cohortLabel}
              </span>
              {timestampLabel ? <span className="text-slate-400">{timestampLabel}</span> : null}
            </div>
          </DialogHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
            {cohortDescription ? (
              <p className="max-w-3xl text-sm text-slate-500">{cohortDescription}</p>
            ) : null}

            {insights ? <div className="text-sm text-slate-600">{insights}</div> : null}

            <motion.div
              ref={containerRef}
              initial={{ opacity: 0.7, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-inner"
              data-widget-export-target
            >
              {children}
            </motion.div>

            {exportFooter}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildTimestampLabel({
  lastUpdated,
  loadedAt,
}: {
  lastUpdated?: string;
  loadedAt?: string | null;
}): string | null {
  if (loadedAt) {
    const loadedDate = safeDate(loadedAt);
    if (loadedDate) {
      return `Loaded ${new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(loadedDate)}`;
    }
  }

  if (lastUpdated) {
    const updatedDate = safeDate(lastUpdated);
    if (updatedDate) {
      return `Last updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(updatedDate)}`;
    }
  }

  if (lastUpdated) {
    return `Last updated ${lastUpdated}`;
  }

  return null;
}

function safeDate(input: string): Date | null {
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExportEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ENABLE_EXPORTS ?? "true";
  return flag !== "false";
}

function now(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function elapsed(start: number): number {
  const end = now();
  return Math.max(Math.round(end - start), 0);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === "string" ? error : "unknown-error";
}

function buildExportEventPayload(
  config: WidgetModalExportConfig,
  format: ExportKind,
  status: "success" | "error",
  errorMessage?: string,
  durationMs?: number,
) {
  return {
    dataset: config.dataset,
    widget: config.widgetKey,
    format,
    status,
    triggeredAt: new Date().toISOString(),
    errorMessage,
    durationMs,
  };
}

function buildDownloadFilename(widgetKey: string, cohortLabel: string, extension: "png" | "csv"): string {
  const timestamp = formatTimestamp(new Date());
  const widgetSegment = sanitizeFilenameSegment(widgetKey);
  const cohortSegment = sanitizeFilenameSegment(cohortLabel);
  return `${widgetSegment}_${timestamp}_${cohortSegment}.${extension}`;
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

function sanitizeFilenameSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "widget";
}

function downloadCsv(content: string, filename: string) {
  const withBom = content.startsWith("\uFEFF") ? content : `\uFEFF${content}`;
  downloadText(withBom, filename, "text/csv;charset=utf-8");
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500",
        className,
      )}
      aria-hidden
    />
  );
}
