import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { normalizeWeeklyMessages } from "@/lib/dashboard-transforms";
import type { WeeklyMessagesEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface WeeklyMessagesChartProps {
  data: WeeklyMessagesEntry[];
  className?: string;
  isExpanded?: boolean;
}

const DEFAULT_BAR_COLOR = "#2e82f6";

export function WeeklyMessagesChart({ data, className, isExpanded = false }: WeeklyMessagesChartProps) {
  const normalizedData = useMemo(() => normalizeWeeklyMessages(data, 12), [data]);
  const hasVolume = useMemo(() => normalizedData.some((entry) => entry.messages > 0), [normalizedData]);

  if (!hasVolume) {
    return null;
  }

  const chartHeight = isExpanded ? 360 : 240;
  const barSize = isExpanded ? 36 : 28;
  const barGap = isExpanded ? 12 : 16;

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={normalizedData}
          margin={{ top: 16, right: 12, left: 12, bottom: 12 }}
          barCategoryGap={barGap}
          barSize={barSize}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            tickMargin={8}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            tickFormatter={(value: number) => `W${value}`}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            width={isExpanded ? 48 : 40}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
          />
          <Tooltip content={<WeeklyMessagesTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="messages" radius={[12, 12, 12, 12]} fill={DEFAULT_BAR_COLOR} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyMessagesTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const week = (item as WeeklyMessagesEntry)?.week ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">Week {week}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}
