"use client";

import { useState } from "react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { KitchenOrderCard } from "./KitchenOrderCard";

interface KitchenQueueProps {
  restaurantName: string;
  logoUrl?: string;
}

export function KitchenQueue({ restaurantName, logoUrl }: KitchenQueueProps) {
  const { 
    pendingOrders, cookingOrders, readyOrders, 
    newOrderIds, isLoading 
  } = useKitchenOrders();
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
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

  const hasOrders = pendingOrders.length + cookingOrders.length > 0;

  return (
    <div className="min-h-screen bg-bg-app">
      <KitchenHeader 
        restaurantName={restaurantName}
        logoUrl={logoUrl}
        timeStr={timeStr}
        pendingCount={pendingOrders.length}
        cookingCount={cookingOrders.length}
        readyCount={readyOrders.length}
        onReadyClick={() => setIsSheetOpen(true)}
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

        {!hasOrders && <KitchenEmptyState timeStr={timeStr} />}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-6 overflow-y-auto bg-white border-l border-border shadow-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-black text-text-main">
              Pedidos Listos del Día
            </SheetTitle>
            <SheetDescription className="text-xs text-text-muted mt-1 leading-relaxed">
              Historial de pedidos que ya fueron marcados como entregados hoy.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {readyOrders.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8 font-medium">
                No hay pedidos listos todavía hoy.
              </p>
            ) : (
              [...readyOrders]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((order) => (
                  <KitchenOrderCard
                    key={order.id}
                    order={order}
                    variant="ready"
                    onAction={() => {}}
                    onReprint={handleReprint}
                  />
                ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
