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

import { formatParticipantId, getTopParticipants, sortUserMessages } from "@/lib/dashboard-transforms";
import type { UserMessagesEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface MessagesByUserChartProps {
  data: UserMessagesEntry[];
  className?: string;
  isExpanded?: boolean;
  collapsedLimit?: number;
}

const DEFAULT_BAR_COLOR = "#124cb0";

export function MessagesByUserChart({
  data,
  className,
  isExpanded = false,
  collapsedLimit = 5,
}: MessagesByUserChartProps) {
  const visibleEntries = useMemo(() => {
    if (isExpanded) {
      return sortUserMessages(data);
    }
    return getTopParticipants(data, collapsedLimit);
  }, [data, isExpanded, collapsedLimit]);

  const hasVolume = useMemo(() => visibleEntries.some((entry) => entry.count > 0), [visibleEntries]);

  if (visibleEntries.length === 0 || !hasVolume) {
    return null;
  }

  const chartHeight = Math.max(visibleEntries.length * (isExpanded ? 48 : 44) + 60, isExpanded ? 360 : 260);

  const containerClasses = cn(
    "h-full w-full",
    isExpanded ? "max-h-[520px] overflow-y-auto pr-2" : null,
    className,
  );

  return (
    <div className={containerClasses}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={visibleEntries} layout="vertical" margin={{ top: 16, right: 12, left: 12, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            tickMargin={8}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            domain={[0, "dataMax"]}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="participant"
            tickLine={false}
            axisLine={false}
            width={isExpanded ? 120 : 100}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            tickFormatter={(value: string) => formatParticipantId(value)}
          />
          <Tooltip content={<MessagesByUserTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="count" radius={[0, 12, 12, 0]} fill={DEFAULT_BAR_COLOR} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MessagesByUserTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const participant = (item as UserMessagesEntry)?.participant ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{participant}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}
