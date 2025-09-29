import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { createCategoryColorMap, getCategoryColor } from "@/lib/color-scale";
import type { NamedCountEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface CategoriesChartProps {
  data: NamedCountEntry[];
  className?: string;
  isExpanded?: boolean;
  collapsedLimit?: number;
}

export function CategoriesChart({
  data,
  className,
  isExpanded = false,
  collapsedLimit = 6,
}: CategoriesChartProps) {
  const sortedEntries = useMemo(
    () => [...data].sort((a, b) => b.count - a.count),
    [data],
  );
  const visibleEntries = useMemo(
    () => (isExpanded ? sortedEntries : sortedEntries.slice(0, collapsedLimit)),
    [sortedEntries, collapsedLimit, isExpanded],
  );

  const colorMap = useMemo(
    () => createCategoryColorMap(sortedEntries.map((entry) => entry.name)),
    [sortedEntries],
  );

  const hasVolume = useMemo(() => visibleEntries.some((entry) => entry.count > 0), [visibleEntries]);

  if (visibleEntries.length === 0 || !hasVolume) {
    return null;
  }

  const chartHeight = isExpanded ? 320 : 260;

  return (
    <div className={cn("h-full w-full", className)}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={visibleEntries} margin={{ top: 16, right: 16, left: 16, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            tickMargin={12}
            height={isExpanded ? 48 : 40}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            interval={0}
            tickFormatter={(value: string) => formatCategoryLabel(value, isExpanded)}
          />
          <YAxis
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            width={isExpanded ? 56 : 48}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
          />
          <Tooltip content={<CategoryTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="count" radius={[12, 12, 12, 12]}>
            {visibleEntries.map((entry) => (
              <Cell key={entry.name} fill={getCategoryColor(entry.name, colorMap)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CategoryTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const category = (item as NamedCountEntry)?.name ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{category}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}

function formatCategoryLabel(label: string, isExpanded: boolean): string {
  if (isExpanded) {
    return label;
  }
  if (label.length <= 10) {
    return label;
  }
  return `${label.slice(0, 9)}…`;
}
