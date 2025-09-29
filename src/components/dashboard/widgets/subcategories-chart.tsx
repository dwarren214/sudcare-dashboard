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

interface SubcategoriesChartProps {
  data: NamedCountEntry[];
  className?: string;
  isExpanded?: boolean;
  collapsedLimit?: number;
}

export function SubcategoriesChart({
  data,
  className,
  isExpanded = false,
  collapsedLimit = 8,
}: SubcategoriesChartProps) {
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

  const chartHeight = Math.max(visibleEntries.length * (isExpanded ? 44 : 40) + 80, isExpanded ? 360 : 280);

  const containerClasses = cn(
    "h-full w-full",
    isExpanded ? "max-h-[520px] overflow-y-auto pr-2" : null,
    className,
  );

  return (
    <div className={containerClasses}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={visibleEntries} layout="vertical" margin={{ top: 16, right: 16, left: 16, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: "#cbd5f5" }}
            tickMargin={12}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={isExpanded ? 160 : 120}
            tick={{ fontSize: isExpanded ? 12 : 11, fill: "#475569" }}
            tickFormatter={(value: string) => formatSubcategoryLabel(value, isExpanded)}
          />
          <Tooltip content={<SubcategoryTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="count" radius={[0, 12, 12, 0]}>
            {visibleEntries.map((entry) => (
              <Cell key={entry.name} fill={getCategoryColor(entry.name, colorMap)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SubcategoryTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const subcategory = (item as NamedCountEntry)?.name ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{subcategory}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}

function formatSubcategoryLabel(label: string, isExpanded: boolean): string {
  if (isExpanded) {
    return label;
  }
  if (label.length <= 18) {
    return label;
  }
  return `${label.slice(0, 17)}…`;
}
