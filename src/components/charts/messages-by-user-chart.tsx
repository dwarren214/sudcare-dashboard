"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ParticipantMessageDatum {
  participant: string;
  count: number;
}

interface MessagesByUserChartProps {
  data: ParticipantMessageDatum[];
}

export function MessagesByUserChart({ data }: MessagesByUserChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
        >
          <CartesianGrid horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" stroke="#475569" tickLine={false} axisLine={false} />
          <YAxis
            dataKey="participant"
            type="category"
            stroke="#475569"
            width={80}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.12)" }} />
          <Bar dataKey="count" fill="#124cb0" radius={8} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
