"use client";

import dynamic from "next/dynamic";

export const OrdersChartDynamic = dynamic(
  () => import("./OrdersChart").then((mod) => mod.OrdersChart),
  {
    ssr: false,
    loading: () => <div className="h-[280px] w-full bg-slate-50/50 animate-pulse rounded-lg" />,
  }
);
