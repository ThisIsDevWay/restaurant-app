"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBs } from "@/lib/money";
import type { DailySalesRow } from "@/db/queries/reports";

/**
 * Área de ventas diarias. El server entrega las filas en orden DESC;
 * se invierten para renderizar cronológicamente. El eje X muestra 'MM-DD'
 * recortando el string de fecha (sin crear objetos Date).
 */
export function DailySalesChart({ data }: { data: DailySalesRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const chartData = [...data].reverse().map((d) => ({
    label: d.date.slice(5), // 'YYYY-MM-DD' -> 'MM-DD'
    grossTotalBsCents: d.grossTotalBsCents,
    orderCount: d.orderCount,
  }));

  if (!mounted) {
    return <div className="h-[220px] w-full animate-pulse rounded-lg bg-slate-50/50" />;
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="dailySalesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#bb0005" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#bb0005" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(value) => [formatBs(Number(value)), "Ventas"]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e8e0d8", fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="grossTotalBsCents"
            name="Ventas"
            stroke="#bb0005"
            strokeWidth={2}
            fill="url(#dailySalesFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
