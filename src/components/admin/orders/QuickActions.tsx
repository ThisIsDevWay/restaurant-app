"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Eye } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ACTION_MAP,
  ACTION_ENDPOINTS,
  type OrderStatus,
  type ActionType,
} from "@/lib/constants/order-status";

export function QuickActions({
  orderId,
  orderStatus,
  compact = false,
}: {
  orderId: string;
  orderStatus: OrderStatus;
  compact?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const actions = ACTION_MAP[orderStatus] ?? [];
  const primary = actions[0];

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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      router.refresh();
    },
  });

  function handleAction(actionType: ActionType, e?: React.MouseEvent) {
    e?.stopPropagation();
    mutation.mutate(actionType);
  }

  if (compact) {
    if (!primary) return null;
    const Icon = primary.icon;
    return (
      <Button
        size="xs"
        variant={primary.variant === "destructive" ? "destructive" : "default"}
        disabled={mutation.isPending}
        onClick={(e) => handleAction(primary.action, e)}
      >
        <Icon />
        {primary.label}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {primary && (
        <Button
          size="xs"
          variant={primary.variant === "destructive" ? "destructive" : "default"}
          disabled={mutation.isPending}
          onClick={(e) => handleAction(primary.action, e)}
        >
          <primary.icon />
          {primary.label}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-xs" />
          }
        >
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/orders/${orderId}`);
            }}
          >
            <Eye />
            Ver detalle
          </DropdownMenuItem>
          {actions.length > 1 && <DropdownMenuSeparator />}
          {actions.slice(1).map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.action}
                variant={action.variant === "destructive" ? "destructive" : "default"}
                onClick={(e) => handleAction(action.action, e)}
              >
                <Icon />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
