import { useMemo } from "react";

import { buildHourlyHeatmap } from "@/lib/dashboard-transforms";
import type { HourCountEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface MessageTimesHeatmapProps {
  data: HourCountEntry[];
  className?: string;
  isExpanded?: boolean;
}

const CHUNK_SIZE = 6;

export function MessageTimesHeatmap({ data, className, isExpanded = false }: MessageTimesHeatmapProps) {
  const cells = useMemo(() => buildHourlyHeatmap(data), [data]);
  const maxCount = useMemo(() => Math.max(0, ...cells.map((cell) => cell.count)), [cells]);

  const rows = useMemo(() => {
    const grouped: typeof cells[] = [];
    for (let index = 0; index < cells.length; index += CHUNK_SIZE) {
      grouped.push(cells.slice(index, index + CHUNK_SIZE));
    }
    return grouped;
  }, [cells]);

  const hasVolume = maxCount > 0;
  if (!hasVolume) {
    return null;
  }

  const tileHeightClass = isExpanded ? "h-16" : "h-12";
  const hourTextClass = isExpanded ? "text-sm" : "text-xs";
  const countTextClass = isExpanded ? "text-xs" : "text-[11px]";

  return (
    <div className={cn("flex h-full w-full flex-col gap-4", className)}>
      <div className="flex flex-col gap-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-2">
            {row.map((cell) => {
              const intensity = maxCount === 0 ? 0 : cell.count / maxCount;
              const background = getIntensityColor(intensity);
              return (
                <div
                  key={cell.hour}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg border border-slate-200 font-medium text-slate-600",
                    tileHeightClass,
                    hourTextClass,
                  )}
                  style={{ backgroundColor: background, color: intensity > 0.6 ? "#f8fafc" : undefined }}
                  title={`${cell.count.toLocaleString()} messages at ${formatHourLabel(cell.hour)}`}
                  role="figure"
                  aria-label={`${cell.count} messages at ${formatHourLabel(cell.hour)}`}
                >
                  <span>{formatHour(cell.hour)}</span>
                  <span className={cn("font-normal text-slate-500", countTextClass)} aria-hidden>
                    {cell.count}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="text-slate-600">Legend</span>
          <LegendSwatch intensity={0} label="No msgs" />
          <LegendSwatch intensity={0.5} label="Moderate" />
          <LegendSwatch intensity={1} label="Peak" />
        </div>
        <span className="text-slate-400">Each tile represents one hour of the day (0–23).</span>
      </div>
    </div>
  );
}

function LegendSwatch({ intensity, label }: { intensity: number; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span
        className="h-3 w-3 rounded-sm border border-slate-200"
        style={{ backgroundColor: getIntensityColor(intensity) }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function getIntensityColor(intensity: number): string {
  const clamped = Math.max(0, Math.min(1, intensity));
  const alpha = 0.18 + clamped * 0.72;
  return `rgba(18, 76, 176, ${alpha.toFixed(2)})`;
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${period}`;
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}
