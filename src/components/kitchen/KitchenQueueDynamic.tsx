"use client";

import dynamic from "next/dynamic";

export const KitchenQueueDynamic = dynamic(
  () => import("./KitchenQueue").then((mod) => mod.KitchenQueue),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-bg-app">
        <p className="text-text-muted">Cargando monitor de cocina...</p>
      </div>
    ),
  }
);
