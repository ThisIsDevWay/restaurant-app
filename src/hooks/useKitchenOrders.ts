import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrdersRealtime } from "@/hooks/useOrdersRealtime";
import type { KitchenOrder } from "@/types/kitchen.types";

async function fetchKitchenOrders(): Promise<KitchenOrder[]> {
  const res = await fetch("/api/kitchen-orders?since=today");
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export function useKitchenOrders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["kitchen-orders"],
    queryFn: fetchKitchenOrders,
  });

  useOrdersRealtime(() => {
    void queryClient.invalidateQueries({ queryKey: ["kitchen-orders"] });
  });

  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const paidOrders = orders.filter((o) => o.status === "paid");
    const currentIds = new Set(paidOrders.map((o) => o.id));

    const newlyAdded = new Set<string>();
    for (const id of currentIds) {
      if (!prevOrderIdsRef.current.has(id)) {
        newlyAdded.add(id);
      }
    }
    prevOrderIdsRef.current = currentIds;

    if (newlyAdded.size > 0) {
      setNewOrderIds(newlyAdded);
      const timeout = setTimeout(() => setNewOrderIds(new Set()), 5000);
      return () => clearTimeout(timeout);
    }
  }, [orders]);

  return {
    orders,
    isLoading,
    newOrderIds,
    pendingOrders: orders.filter((o) => o.status === "paid"),
    cookingOrders: orders.filter((o) => o.status === "kitchen"),
    readyOrders: orders.filter((o) => o.status === "delivered"),
  };
}
