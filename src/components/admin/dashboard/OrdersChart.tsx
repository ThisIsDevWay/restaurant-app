"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const weekData = [
  { day: "Lun", orders: 12, sales: 245 },
  { day: "Mar", orders: 18, sales: 380 },
  { day: "Mié", orders: 15, sales: 310 },
  { day: "Jue", orders: 22, sales: 465 },
  { day: "Vie", orders: 28, sales: 590 },
  { day: "Sáb", orders: 35, sales: 720 },
  { day: "Dom", orders: 30, sales: 640 },
];

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
          {entry.name}: <span className="font-semibold text-text-main">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function OrdersChart() {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={weekData}
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
            dataKey="day"
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
            name="Ventas ($)"
            stroke="#2d6a1f"
            strokeWidth={2}
            fill="url(#colorSales)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
