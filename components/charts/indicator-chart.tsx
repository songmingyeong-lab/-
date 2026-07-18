"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/indicators/types";

export function IndicatorChart({ data, unit, name }: { data: SeriesPoint[]; unit: string; name: string }) {
  if (data.length === 0) return <div className="empty-chart" role="img" aria-label={`${name}: 자료 없음`}>자료 없음</div>;
  return (
    <div className="chart-box" role="img" aria-label={`${name} 시계열 차트, 단위 ${unit}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#edf0f2" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#65717e" }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#65717e" }} tickLine={false} axisLine={false} width={55} />
          <Tooltip formatter={(value) => value === null ? ["자료 없음", name] : [`${Number(value).toLocaleString("ko-KR")} ${unit}`, name]} labelFormatter={(label) => `기준: ${label}`} />
          <Line type="monotone" dataKey="value" stroke="#245b91" strokeWidth={2.5} dot={{ r: 3, fill: "#fff", strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
