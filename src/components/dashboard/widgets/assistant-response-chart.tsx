import { useMemo } from "react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, type TooltipProps } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { summarizeAssistantResponses } from "@/lib/dashboard-transforms";
import type { TrueFalseCountEntry } from "../../../../types/dashboard";
import { cn } from "@/lib/utils";

interface AssistantResponseChartProps {
  data: TrueFalseCountEntry[];
  className?: string;
  isExpanded?: boolean;
}

const TRUE_COLOR = "#22c55e";
const FALSE_COLOR = "#ef4444";

export function AssistantResponseChart({ data, className, isExpanded = false }: AssistantResponseChartProps) {
  const summary = useMemo(() => summarizeAssistantResponses(data), [data]);

  const chartData = useMemo(() => {
    return [
      { name: "Intent met", value: summary.trueCount, label: "intent-met", color: TRUE_COLOR },
      { name: "Intent not met", value: summary.falseCount, label: "intent-not-met", color: FALSE_COLOR },
    ];
  }, [summary.falseCount, summary.trueCount]);

  if (summary.total === 0) {
    return null;
  }

  const innerRadius = isExpanded ? 72 : 64;
  const outerRadius = isExpanded ? 110 : 92;

  return (
    <div className={cn("relative flex h-full w-full flex-col items-center justify-center", className)}>
      <ResponsiveContainer width="100%" height={isExpanded ? 320 : 260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            blendStroke
          >
            {chartData.map((entry) => (
              <Cell key={entry.label} fill={entry.color} stroke="white" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip content={<AssistantResponseTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex -translate-y-9 translate-x-1 transform flex-col items-center justify-center space-y-1 text-center">
        <span className="text-3xl font-semibold leading-none text-slate-900">{summary.percentageTrue}%</span>
        <span className="text-xs uppercase tracking-wide text-slate-500 leading-none">Intent met</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600">
        {chartData.map((entry) => (
          <div key={entry.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
            <span className="font-medium text-slate-700">{entry.name}</span>
            <span className="text-xs text-slate-500">{entry.value.toLocaleString()} msgs</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssistantResponseTooltip({ active, payload }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const [{ value, payload: item }] = payload;
  const label = (item as { name?: string })?.name ?? "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-sm shadow">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-xs text-slate-500">{Number(value).toLocaleString()} messages</p>
    </div>
  );
}
