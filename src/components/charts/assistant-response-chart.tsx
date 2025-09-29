"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export interface AssistantResponseDatum {
  able: "TRUE" | "FALSE";
  count: number;
}

interface AssistantResponseChartProps {
  data: ReadonlyArray<AssistantResponseDatum>;
}

const COLORS: Record<AssistantResponseDatum["able"], string> = {
  TRUE: "#22c55e",
  FALSE: "#ef4444",
};

const LABELS: Record<AssistantResponseDatum["able"], string> = {
  TRUE: "Intent met",
  FALSE: "Intent not met",
};

export function AssistantResponseChart({ data }: AssistantResponseChartProps) {
  const chartData = useMemo(() => data.map((entry) => ({ ...entry, label: LABELS[entry.able] })), [data]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="label"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
          >
            {chartData.map((entry) => (
              <Cell key={entry.able} fill={COLORS[entry.able]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value as number, name as string]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
