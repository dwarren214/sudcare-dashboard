import { useMemo } from "react";

import {
  buildDayHourHeatmap,
  buildHourlyHeatmap,
  formatWeekdayAbbreviation,
} from "@/lib/dashboard-transforms";
import type { DayHourCountEntry, HourCountEntry, WeekdayName } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

export type MessageTimesView = "aggregate" | "weekday";

interface MessageTimesHeatmapProps {
  hourlyData: HourCountEntry[];
  dayData?: DayHourCountEntry[];
  view: MessageTimesView;
  className?: string;
  isExpanded?: boolean;
}

const CHUNK_SIZE = 6;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const DAY_LABEL_COLUMN = "minmax(2.25rem, 2.75rem)";
const DAY_LABEL_COLUMN_EXPANDED = "minmax(2.75rem, 3.25rem)";
const HOUR_COLUMN_FRACTION = "minmax(0, 1fr)";

export function MessageTimesHeatmap({
  hourlyData,
  dayData,
  view,
  className,
  isExpanded = false,
}: MessageTimesHeatmapProps) {
  const hourlyCells = useMemo(() => buildHourlyHeatmap(hourlyData), [hourlyData]);
  const dayRows = useMemo(() => buildDayHourHeatmap(dayData ?? []), [dayData]);
  const hourlyRows = useMemo(() => {
    const grouped: typeof hourlyCells[] = [];
    for (let index = 0; index < hourlyCells.length; index += CHUNK_SIZE) {
      grouped.push(hourlyCells.slice(index, index + CHUNK_SIZE));
    }
    return grouped;
  }, [hourlyCells]);

  const hourlyMax = useMemo(() => getMaxCount(hourlyCells), [hourlyCells]);
  const dayMax = useMemo(
    () => getMaxCount(dayRows.flatMap((row) => row.cells)),
    [dayRows],
  );
  const activeMax = view === "weekday" ? dayMax : hourlyMax;
  const legendCaption =
    view === "weekday"
      ? "Tiles show message counts for each day/hour combination."
      : "Each tile represents one hour of the day (0–23).";

  if (view === "weekday") {
    const provided = Boolean(dayData && dayData.length > 0);
    if (!provided) {
      return (
        <div className={cn("flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm text-slate-600", className)}>
          Day-of-week breakdown is not yet available for this dataset.
        </div>
      );
    }

    const gridTemplate = `${isExpanded ? DAY_LABEL_COLUMN_EXPANDED : DAY_LABEL_COLUMN} repeat(${HOURS.length}, ${HOUR_COLUMN_FRACTION})`;
    return (
      <div className={cn("flex h-full w-full flex-col gap-4", className)}>
        <div
          className="grid gap-1 text-[10px] font-medium uppercase tracking-wide text-slate-400"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span className="text-left text-[11px] leading-none text-slate-500">Day</span>
          {HOURS.map((hour) => (
            <span key={`header-${hour}`} className="text-center leading-tight">
              {formatHourCompact(hour)}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          {dayRows.map((row) => (
            <div
              key={row.day}
              className="grid items-center gap-1"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <span className="text-[11px] font-medium text-slate-600">{formatWeekdayShort(row.day)}</span>
              {row.cells.map((cell) => {
                const intensity = activeMax === 0 ? 0 : cell.count / activeMax;
                const background = getIntensityColor(intensity);
                return (
                  <div
                    key={`${cell.day}-${cell.hour}`}
                    className={cn(
                      "flex w-full items-center justify-center rounded-md border border-slate-200 text-[10px] font-semibold text-slate-600",
                      isExpanded ? "aspect-square min-h-[30px]" : "aspect-square min-h-[22px]",
                    )}
                    style={{ backgroundColor: background, color: intensity > 0.6 ? "#f8fafc" : undefined }}
                    title={`${cell.count.toLocaleString()} messages on ${cell.day} at ${formatHourLabel(cell.hour)}`}
                    role="figure"
                    aria-label={`${cell.count} messages on ${cell.day} at ${formatHourLabel(cell.hour)}`}
                  >
                    <span aria-hidden>{cell.count}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <Legend caption={legendCaption} />
      </div>
    );
  }

  if (hourlyMax === 0) {
    return null;
  }

  const tileHeightClass = isExpanded ? "h-16" : "h-12";
  const hourTextClass = isExpanded ? "text-sm" : "text-xs";
  const countTextClass = isExpanded ? "text-xs" : "text-[11px]";

  return (
    <div className={cn("flex h-full w-full flex-col gap-4", className)}>
      <div className="flex flex-col gap-3">
        {hourlyRows.map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-6 gap-2">
            {row.map((cell) => {
              const intensity = hourlyMax === 0 ? 0 : cell.count / hourlyMax;
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
      <Legend caption={legendCaption} />
    </div>
  );
}

function Legend({ caption }: { caption: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span className="text-slate-600">Legend</span>
        <LegendSwatch intensity={0} label="No msgs" />
        <LegendSwatch intensity={0.5} label="Moderate" />
        <LegendSwatch intensity={1} label="Peak" />
      </div>
      <span className="text-slate-400">{caption}</span>
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

function getMaxCount<T extends { count: number }>(cells: T[]): number {
  if (cells.length === 0) {
    return 0;
  }
  return Math.max(0, ...cells.map((cell) => cell.count));
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}${period}`;
}

function formatHourCompact(hour: number): string {
  if (hour === 0) {
    return "12a";
  }
  if (hour === 12) {
    return "12p";
  }
  if (hour < 12) {
    return `${hour}a`;
  }
  return `${hour - 12}p`;
}

function formatHourLabel(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function formatWeekdayShort(day: WeekdayName): string {
  return formatWeekdayAbbreviation(day);
}
