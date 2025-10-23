import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import type { CalendarWeekMessagesEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface MessagesByCalendarWeekChartProps {
  data: CalendarWeekMessagesEntry[];
  className?: string;
  isExpanded?: boolean;
}

interface CalendarWeekChartPoint extends CalendarWeekMessagesEntry {
  weekStartDate: Date;
}

const SHORT_TICK_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const EXPANDED_TICK_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const TOOLTIP_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" });

export function MessagesByCalendarWeekChart({
  data,
  className,
  isExpanded = false,
}: MessagesByCalendarWeekChartProps) {
  const chartData = useMemo<CalendarWeekChartPoint[]>(() => {
    return data
      .map((entry) => {
        const date = new Date(`${entry.weekStart}T00:00:00Z`);
        return {
          ...entry,
          weekStartDate: date,
        };
      })
      .filter((entry) => !Number.isNaN(entry.weekStartDate.getTime()))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  }, [data]);

  const hasVolume = useMemo(() => chartData.some((entry) => entry.messages > 0), [chartData]);
  const gradientId = useId();

  const ticks = useMemo(() => {
    if (chartData.length === 0) {
      return [];
    }

    const desiredTickCount = isExpanded ? 12 : 6;
    const step = Math.max(1, Math.ceil(chartData.length / desiredTickCount));
    const seen = new Set<string>();
    const tickValues: string[] = [];

    chartData.forEach((entry, index) => {
      const isBoundary = index === 0 || index === chartData.length - 1;
      const matchesStep = index % step === 0;

      if ((matchesStep || isBoundary) && !seen.has(entry.weekStart)) {
        seen.add(entry.weekStart);
        tickValues.push(entry.weekStart);
      }
    });

    return tickValues;
  }, [chartData, isExpanded]);

  if (!hasVolume) {
    return null;
  }

  const chartHeight = isExpanded ? 360 : 260;

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <AreaChart data={chartData} margin={{ top: 16, right: 20, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="weekStart"
            ticks={ticks}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            tickMargin={12}
            interval={0}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            tickFormatter={(value: string) => formatTickLabel(value, isExpanded)}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            width={isExpanded ? 56 : 48}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
          />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={<CalendarWeekTooltip />}
          />
          <Area
            type="monotone"
            dataKey="messages"
            stroke="#2563eb"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            activeDot={{ r: isExpanded ? 5 : 4, fill: "#1d4ed8" }}
            dot={isExpanded}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CalendarWeekTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const { isoWeek, weekStartDate } = (item ?? {}) as CalendarWeekChartPoint;

  const formattedDate = formatTooltipDate(weekStartDate);
  const messageCount = Number(value).toLocaleString();

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{`Week of ${formattedDate}`}</p>
      <p className="text-xs text-slate-500">{`${isoWeek} · ${messageCount} messages`}</p>
    </div>
  );
}

function formatTickLabel(weekStart: string, expanded: boolean): string {
  const date = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return weekStart;
  }

  return expanded ? EXPANDED_TICK_FORMATTER.format(date) : SHORT_TICK_FORMATTER.format(date);
}

function formatTooltipDate(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return TOOLTIP_DATE_FORMATTER.format(date);
}
