"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Calendar } from "lucide-react";
import { OrderList } from "@/components/admin/orders/OrderList";
import { TABS, type TabFilter } from "@/lib/constants/order-status";
import type { OrderListItem } from "@/components/admin/orders/OrderCard";

interface TabCounts {
  all: number;
  pending: number;
  preparing: number;
  history: number;
}

export function OrdersClient({ orders, initialDate }: { orders: OrderListItem[], initialDate: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");
  // Transition flag suppresses the empty-state flash on tab change
  const [isPending, startTransition] = useTransition();

  const { data: counts } = useQuery<TabCounts>({
    queryKey: ["orders", "counts", initialDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/counts?date=${initialDate}`);
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

  const { data: currentOrders } = useQuery({
    queryKey: ["orders", "list", initialDate],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders?date=${initialDate}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    initialData: orders,
    refetchInterval: 30_000,
  });

  const filteredOrders = useMemo(() => {
    const tabConfig = TABS.find((t) => t.value === activeTab);
    let result = (currentOrders as OrderListItem[]).filter(
      (o) => tabConfig?.filterFn(o.status) ?? true,
    );

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
  }, [currentOrders, activeTab, search]);

  function handleTabChange(value: TabFilter) {
    // Wrap in startTransition so React defers the re-render.
    // While the transition is pending, isPending=true which:
    //   1. Dims the list area slightly (opacity-60)
    //   2. Prevents the empty-state graphic from flashing
    startTransition(() => {
      setActiveTab(value);
    });
  }

  function handleDateChange(newDate: string) {
    const params = new URLSearchParams(searchParams);
    params.set("date", newDate);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Órdenes</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-text-muted">
              {orders.length} órdenes registradas
            </p>
            {counts.pending > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse border border-amber-200">
                {counts.pending} por atender
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Filters: Search & Date */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        {/* Date Picker */}
        <div className="relative w-full sm:w-auto">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            type="date"
            value={initialDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="pl-9 h-10 bg-white border-border shadow-sm focus-visible:ring-primary w-full sm:w-[160px] text-sm tabular-nums"
          />
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-[260px] transition-all focus-within:w-full sm:focus-within:w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <Input
            placeholder="Buscar por # o teléfono..."
            className="pl-9 pr-10 h-10 bg-white border-border shadow-sm focus-visible:ring-primary"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted text-text-muted transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-0.5">
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

          const tabColors: Record<TabFilter, string> = {
            all: "bg-primary text-primary-foreground",
            pending: "bg-amber-500 text-white",
            preparing: "bg-orange-500 text-white",
            history: "bg-slate-600 text-white",
          };

          return (
            <button
              key={tab.value}
              onClick={() => handleTabChange(tab.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all shadow-sm active:scale-95",
                isActive
                  ? tabColors[tab.value]
                  : "bg-white text-text-muted hover:text-text-main border border-border",
              )}
            >
              <Icon className={cn("h-4 w-4", !isActive && "opacity-60")} />
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "text-[11px] h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full leading-none",
                    isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders — opacity signals transition without causing layout jank */}
      <div
        className={cn(
          "bg-white rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px] transition-opacity duration-150",
          isPending && "opacity-60",
        )}
      >
        <OrderList orders={filteredOrders} suppressEmpty={isPending} />
      </div>
    </div>
  );
}
