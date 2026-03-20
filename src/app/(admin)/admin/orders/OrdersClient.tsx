"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { OrderList } from "@/components/admin/orders/OrderList";
import { TABS, type TabFilter } from "@/lib/constants/order-status";
import type { OrderListItem } from "@/components/admin/orders/OrderCard";

interface TabCounts {
  all: number;
  pending: number;
  preparing: number;
  history: number;
}

export function OrdersClient({ orders }: { orders: OrderListItem[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");

  // Poll counts every 30 seconds
  const { data: counts } = useQuery<TabCounts>({
    queryKey: ["orders", "counts"],
    queryFn: async () => {
      const res = await fetch("/api/admin/orders/counts");
      if (!res.ok) throw new Error("Failed to fetch counts");
      return res.json();
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    initialData: {
      all: orders.length,
      pending: orders.filter((o) => o.status === "pending" || o.status === "whatsapp").length,
      preparing: orders.filter((o) => o.status === "paid" || o.status === "kitchen").length,
      history: orders.filter((o) =>
        ["delivered", "expired", "failed", "cancelled"].includes(o.status),
      ).length,
    },
  });

  const filteredOrders = useMemo(() => {
    const tabConfig = TABS.find((t) => t.value === activeTab);
    let result = orders.filter((o) => tabConfig?.filterFn(o.status) ?? true);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((o) => {
        const orderNum = String(o.orderNumber ?? "");
        const phone = o.customerPhone ?? "";
        const items = (o.itemsSnapshot as Array<{ name: string }>) ?? [];
        const itemNames = items.map((i) => i.name.toLowerCase()).join(" ");

        return (
          orderNum.includes(q) ||
          phone.endsWith(q) ||
          phone.includes(q) ||
          itemNames.includes(q)
        );
      });
    }

    return result;
  }, [orders, activeTab, search]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-main">Órdenes</h1>
        <p className="text-sm text-text-muted">
          {orders.length} órdenes totales
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
        <Input
          placeholder="Buscar por # orden o teléfono..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const count =
            tab.value === "all"
              ? counts.all
              : tab.value === "pending"
                ? counts.pending
                : tab.value === "preparing"
                  ? counts.preparing
                  : counts.history;
          const Icon = tab.icon;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-xs rounded-full px-1.5",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders */}
      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          <OrderList orders={filteredOrders} />
        </CardContent>
      </Card>
    </div>
  );
}
