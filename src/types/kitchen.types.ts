import type { Store } from "lucide-react";
import type { MapPin, Package } from "lucide-react";

export interface KitchenOrderItem {
  id: string;
  name: string;
  includedNote?: string | null;
  selectedContorno: { id: string; name: string } | null;
  fixedContornos?: Array<{ id: string; name: string; priceUsdCents: number; priceBsCents: number }>;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    quantity?: number;
    substitutesComponentId?: string;
    substitutesComponentName?: string;
  }>;
  selectedBebidas?: Array<{
    id: string;
    name: string;
    quantity?: number;
  }>;
  removedComponents: Array<{
    isRemoval: true;
    componentId: string;
    name: string;
  }>;
  quantity: number;
}

export interface KitchenOrder {
  id: string;
  orderNumber: number;
  customerPhone: string;
  itemsSnapshot: KitchenOrderItem[];
  status: "paid" | "kitchen" | "delivered" | "whatsapp";
  paymentMethod: string;
  orderMode?: "on_site" | "take_away" | "delivery" | null;
  deliveryAddress?: string | null;
  tableNumber?: string | null;
  subtotalBsCents: number;
  createdAt: string;
}

export type CardVariant = "pending" | "cooking" | "ready";

export const ORDER_MODE_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  on_site: { label: "En sitio", icon: "Store", color: "bg-info/10 text-info border-info/20" },
  take_away: { label: "Para llevar", icon: "Package", color: "bg-amber/10 text-amber border-amber/20" },
  delivery: { label: "Delivery", icon: "MapPin", color: "bg-success/10 text-success border-success/20" },
};
