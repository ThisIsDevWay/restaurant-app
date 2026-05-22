"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBs } from "@/lib/money";
import type { WeeklySalesRow } from "@/db/queries/reports";

/**
 * Tendencia de ventas semanales (semana ISO). El server entrega DESC;
 * se invierte para orden cronológico.
 */
export function WeeklySalesChart({ data }: { data: WeeklySalesRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = [...data].reverse().map((d) => ({
    label: `semana ${d.isoWeek}`,
    grossTotalBsCents: d.grossTotalBsCents,
    orderCount: d.orderCount,
  }));

  if (!mounted) {
    return <div className="h-[220px] w-full animate-pulse rounded-lg bg-slate-50/50" />;
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8a8278", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={92}
            tick={{ fill: "#8a8278", fontSize: 11 }}
            tickFormatter={(value) => formatBs(Number(value))}
          />
          <Tooltip
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
            formatter={(value) => [formatBs(Number(value)), "Ventas"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d8", fontSize: 12 }}
          />
          <Bar
            dataKey="grossTotalBsCents"
            name="Ventas"
            fill="#bb0005"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
