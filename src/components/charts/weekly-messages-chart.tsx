"use client";

import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from "recharts";

interface WeeklyMessageDatum {
  week: number;
  messages: number;
}

interface WeeklyMessagesChartProps {
  data: WeeklyMessageDatum[];
}

export function WeeklyMessagesChart({ data }: WeeklyMessagesChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" stroke="#475569" />
          <YAxis stroke="#475569" />
          <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="messages" fill="#2e82f6" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
