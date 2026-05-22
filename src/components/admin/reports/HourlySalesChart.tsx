"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBs } from "@/lib/money";
import type { HourlySalesRow } from "@/db/queries/reports";

/**
 * Curva de ventas por hora (0-23, hora local Caracas).
 * Rellena las horas sin datos con 0 para mantener el eje continuo.
 * Horas de almuerzo (11-15) resaltadas en rojo; resto en arena.
 */
export function HourlySalesChart({ data }: { data: HourlySalesRow[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const byHour = new Map(data.map((d) => [d.hour, d]));
  const chartData = Array.from({ length: 24 }, (_, h) => {
    const period = h >= 12 ? "p.m." : "a.m.";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const row = byHour.get(h);
    return {
      hour: h,
      label: `${h12}${period}`,
      grossTotalBsCents: row?.grossTotalBsCents ?? 0,
      orderCount: row?.orderCount ?? 0,
    };
  });

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
            interval={1}
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
          <Bar dataKey="grossTotalBsCents" name="Ventas" radius={[4, 4, 0, 0]}>
            {chartData.map((d) => (
              <Cell
                key={d.hour}
                fill={d.hour >= 11 && d.hour <= 15 ? "#bb0005" : "#d4bfa0"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
