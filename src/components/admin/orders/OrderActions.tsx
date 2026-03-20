"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  Printer,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ACTION_MAP,
  ACTION_ENDPOINTS,
  type OrderStatus,
  type ActionType,
} from "@/lib/constants/order-status";

const DETAIL_ACTION_CONFIG: Record<
  string,
  {
    label: string;
    icon: typeof CheckCircle;
    variant: "default" | "destructive" | "outline";
    actionType: ActionType | "print";
  }
> = {
  confirm: {
    label: "Confirmar orden",
    icon: CheckCircle,
    variant: "default",
    actionType: "confirm",
  },
  confirm_manual: {
    label: "Confirmar pago",
    icon: CheckCircle,
    variant: "default",
    actionType: "confirm_manual",
  },
  mark_kitchen: {
    label: "Enviar a cocina",
    icon: ChefHat,
    variant: "default",
    actionType: "mark_kitchen",
  },
  mark_delivered: {
    label: "Marcar entregada",
    icon: Truck,
    variant: "default",
    actionType: "mark_delivered",
  },
  cancel: {
    label: "Cancelar orden",
    icon: XCircle,
    variant: "destructive",
    actionType: "cancel",
  },
  print: {
    label: "Imprimir ticket",
    icon: Printer,
    variant: "outline",
    actionType: "print",
  },
};

const DESTRUCTIVE_ACTIONS: Set<string> = new Set(["cancel"]);

export function OrderActions({
  orderId,
  orderStatus,
}: {
  orderId: string;
  orderStatus: OrderStatus;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const quickActions = ACTION_MAP[orderStatus] ?? [];

  const mutation = useMutation({
    mutationFn: async (actionType: ActionType) => {
      const config = ACTION_ENDPOINTS[actionType];
      const url = config.url(orderId);
      const body = config.body ? config.body(orderId) : {};

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al actualizar la orden");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.refresh();
    },
  });

  function handleAction(key: string) {
    if (key === "print") {
      window.print();
      return;
    }

    if (DESTRUCTIVE_ACTIONS.has(key)) {
      setConfirmKey(key);
      return;
    }

    const config = DETAIL_ACTION_CONFIG[key];
    if (config?.actionType && config.actionType !== "print") {
      mutation.mutate(config.actionType as ActionType);
    }
  }

  function handleConfirm() {
    if (confirmKey) {
      const config = DETAIL_ACTION_CONFIG[confirmKey];
      if (config?.actionType && config.actionType !== "print") {
        mutation.mutate(config.actionType as ActionType);
      }
      setConfirmKey(null);
    }
  }

  const detailActions = quickActions.map((qa) => qa.action);
  if (detailActions.length === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap" data-actions>
      {quickActions.map((qa) => {
        const config = DETAIL_ACTION_CONFIG[qa.action];
        if (!config) return null;
        const Icon = config.icon;
        const key = qa.action;

        if (DESTRUCTIVE_ACTIONS.has(key)) {
          return (
            <Dialog
              key={key}
              open={confirmKey === key}
              onOpenChange={(open) => {
                if (!open) setConfirmKey(null);
              }}
            >
              <DialogTrigger
                render={
                  <Button
                    variant={config.variant}
                    size="sm"
                    disabled={mutation.isPending}
                  />
                }
                onClick={() => setConfirmKey(key)}
              >
                <Icon />
                {config.label}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{config.label}</DialogTitle>
                  <DialogDescription>
                    ¿Estás seguro de que deseas cancelar esta orden? Esta acción
                    no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmKey(null)}
                  >
                    Volver
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={mutation.isPending}
                  >
                    {mutation.isPending
                      ? "Procesando..."
                      : "Confirmar cancelación"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        }

        return (
          <Button
            key={key}
            variant={config.variant}
            size="sm"
            onClick={() => handleAction(key)}
            disabled={mutation.isPending}
          >
            <Icon />
            {mutation.isPending ? "Procesando..." : config.label}
          </Button>
        );
      })}

      {/* Print always available */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
      >
        <Printer />
        Imprimir ticket
      </Button>
    </div>
  );
}
