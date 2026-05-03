"use client";

import { toast } from "sonner";
import { reprintOrderAction } from "@/actions/print";
import { updateOrderStatusAction } from "@/actions/orders";

// Hooks
import { useClock } from "@/hooks/useClock";
import { useKitchenOrders } from "@/hooks/useKitchenOrders";

// Components
import { KitchenHeader } from "./KitchenHeader";
import { KitchenColumn } from "./KitchenColumn";
import { KitchenEmptyState, KitchenLoadingState } from "./KitchenStates";

interface KitchenQueueProps {
  restaurantName: string;
  logoUrl?: string;
}

export function KitchenQueue({ restaurantName, logoUrl }: KitchenQueueProps) {
  const { 
    pendingOrders, cookingOrders, readyOrders, 
    newOrderIds, isLoading 
  } = useKitchenOrders();
  
  const currentTime = useClock();
  const timeStr = currentTime.toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleAction = async (orderId: string, status: "kitchen" | "delivered") => {
    try {
      const result = await updateOrderStatusAction({ orderId, status });
      if (result?.serverError) throw new Error(result.serverError);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar pedido");
    }
  };

  const handleReprint = async (orderId: string) => {
    const result = await reprintOrderAction({ orderId });
    if (result?.data?.success) {
      toast.success("Impresión enviada");
    } else {
      toast.error("Error al enviar impresión");
    }
  };

  if (isLoading) return <KitchenLoadingState />;

  const hasOrders = pendingOrders.length + cookingOrders.length + readyOrders.length > 0;

  return (
    <div className="min-h-screen bg-bg-app">
      <KitchenHeader 
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        timeStr={timeStr}
        pendingCount={pendingOrders.length}
        cookingCount={cookingOrders.length}
        readyCount={readyOrders.length}
      />

      <div className="p-4 sm:p-6">
        <KitchenColumn 
          variant="pending" 
          orders={pendingOrders} 
          newOrderIds={newOrderIds}
          onAction={(id) => handleAction(id, "kitchen")}
          onReprint={handleReprint}
        />

        <KitchenColumn 
          variant="cooking" 
          orders={cookingOrders}
          onAction={(id) => handleAction(id, "delivered")}
          onReprint={handleReprint}
        />

        <KitchenColumn 
          variant="ready" 
          orders={readyOrders}
          onAction={() => {}}
          onReprint={handleReprint}
        />

        {!hasOrders && <KitchenEmptyState timeStr={timeStr} />}
      </div>
    </div>
  );
}
