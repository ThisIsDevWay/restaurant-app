"use client";

import { useState, useEffect, useMemo } from "react";
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

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl bg-white px-4 py-3 shadow-elevated ring-1 ring-border">
      <p className="text-xs font-semibold text-text-main mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <p key={index} className="text-xs text-text-muted">
          <span
            className="inline-block h-2 w-2 rounded-full mr-1.5"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: <span className="font-semibold text-text-main">
            {entry.dataKey === "sales" ? formatBs(entry.value * 100) : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export function OrdersChart({ todayOrders = [] }: { todayOrders?: any[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartData = useMemo(() => {
    if (!todayOrders || todayOrders.length === 0) return [];
    
    // Group by hour
    const hours = Array.from({ length: 24 }, (_, i) => {
      const period = i >= 12 ? 'p.m.' : 'a.m.';
      const hour12 = i % 12 === 0 ? 12 : i % 12;
      return {
        hourNum: i,
        time: `${hour12}:00 ${period}`,
        orders: 0,
        sales: 0,
      };
    });

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas",
      hour: "numeric",
      hour12: false,
    });

    todayOrders.forEach(order => {
      let hour = parseInt(formatter.format(new Date(order.createdAt)), 10);
      if (hour === 24) hour = 0;
      
      hours[hour].orders += 1;
      hours[hour].sales += (order.subtotalBsCents ?? 0) / 100;
    });

    // Only show from first order to current hour (or last order)
    const currentHour = parseInt(formatter.format(new Date()), 10);
    const firstOrderHour = hours.findIndex(h => h.orders > 0);
    
    const startIdx = Math.max(0, firstOrderHour === -1 ? 8 : Math.min(8, firstOrderHour)); // Start at 8am or earlier
    const endIdx = currentHour === 24 ? 23 : currentHour;

    return hours.slice(startIdx, endIdx + 1);
  }, [todayOrders]);

  if (!isMounted) {
    return <div className="h-[280px] w-full bg-slate-50/50 animate-pulse rounded-lg" />;
  }

  if (chartData.length === 0) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-slate-50/30">
        <p className="text-sm text-text-muted font-medium">Aún no hay ventas para mostrar hoy</p>
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b2500" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#8b2500" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2d6a1f" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#2d6a1f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e0d8" vertical={false} />
          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8a8278", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#8a8278", fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="orders"
            name="Órdenes"
            stroke="#8b2500"
            strokeWidth={2}
            fill="url(#colorOrders)"
          />
          <Area
            type="monotone"
            dataKey="sales"
            name="Ventas (Bs)"
            stroke="#2d6a1f"
            strokeWidth={2}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
