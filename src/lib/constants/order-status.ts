import type { LucideIcon } from "lucide-react";
import { orders } from "@/db/schema";
import {
  CheckCircle,
  ChefHat,
  Truck,
  XCircle,
  Clock,
  History,
  LayoutList,
} from "lucide-react";

/** Single source of truth: derived from the Drizzle schema `orders.status` column */
export type OrderStatus = NonNullable<typeof orders.$inferSelect["status"]>;

export interface StatusConfig {
  label: string;
  className: string;
}

export const STATUS_STYLES: Record<OrderStatus, StatusConfig> = {
  pending: {
    label: "Pendiente",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  paid: {
    label: "Pagado",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  kitchen: {
    label: "En cocina",
    className: "bg-orange-100 text-orange-800 border-orange-200",
  },
  delivered: {
    label: "Entregado",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  expired: {
    label: "Expirada",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  failed: {
    label: "Fallido",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  whatsapp: {
    label: "WhatsApp",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  cancelled: {
    label: "Cancelada",
    className: "bg-red-100 text-red-800 border-red-200",
  },
};

export type ActionType =
  | "confirm"
  | "confirm_manual"
  | "confirm_with_ref"     // pending → paid, requires reference number
  | "mark_kitchen"
  | "mark_delivered"
  | "cancel";

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  action: ActionType;
  variant: "default" | "destructive";
}

export const ACTION_MAP: Record<OrderStatus, QuickAction[]> = {
  // pending = customer hasn't paid yet
  // Admin must capture the payment reference before confirming
  pending: [
    { label: "Confirmar con referencia", icon: CheckCircle, action: "confirm_with_ref", variant: "default" },
  ],
  // whatsapp = manual payment provider, confirm via provider flow
  whatsapp: [
    { label: "Confirmar pago", icon: CheckCircle, action: "confirm_manual", variant: "default" },
  ],
  // paid = already visible in KDS, no manual push to kitchen needed
  paid: [],
  kitchen: [
    { label: "Marcar entregada", icon: Truck, action: "mark_delivered", variant: "default" },
  ],
  delivered: [],
  expired: [],
  failed: [],
  cancelled: [],
};

export const ACTION_ENDPOINTS: Record<
  ActionType,
  { url: (orderId: string) => string; body?: (orderId: string) => Record<string, unknown> }
> = {
  confirm: {
    url: (id) => `/api/admin/orders/${id}/status`,
    body: () => ({ status: "paid" }),
  },
  confirm_manual: {
    url: (id) => `/api/admin/orders/${id}/confirm-manual`,
  },
  // confirm_with_ref requires a paymentReference in the body;
  // the UI handles this by opening a modal before calling the endpoint.
  confirm_with_ref: {
    url: (id) => `/api/admin/orders/${id}/confirm-with-ref`,
    // body is built dynamically with the reference the admin enters
  },
  mark_kitchen: {
    url: (id) => `/api/admin/orders/${id}/status`,
    body: () => ({ status: "kitchen" }),
  },
  mark_delivered: {
    url: (id) => `/api/admin/orders/${id}/status`,
    body: () => ({ status: "delivered" }),
  },
  cancel: {
    url: (id) => `/api/admin/orders/${id}/cancel`,
  },
};

export type TabFilter = "all" | "pending" | "preparing" | "history";

export interface TabConfig {
  value: TabFilter;
  label: string;
  icon: LucideIcon;
  filterFn: (status: string) => boolean;
}

export const TABS: TabConfig[] = [
  {
    value: "all",
    label: "Todas",
    icon: LayoutList,
    filterFn: () => true,
  },
  {
    value: "pending",
    label: "Pendientes",
    icon: Clock,
    filterFn: (s) => s === "pending" || s === "whatsapp",
  },
  {
    value: "preparing",
    label: "En Cocina",
    icon: ChefHat,
    filterFn: (s) => s === "paid" || s === "kitchen",
  },
  {
    value: "history",
    label: "Historial",
    icon: History,
    filterFn: (s) => s === "delivered" || s === "expired" || s === "failed" || s === "cancelled",
  },
];

export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "paid",
  paid: "kitchen",
  kitchen: "delivered",
};
