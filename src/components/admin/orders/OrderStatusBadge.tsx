import { Badge } from "@/components/ui/badge";

type OrderStatus =
  | "pending"
  | "paid"
  | "kitchen"
  | "delivered"
  | "expired"
  | "failed"
  | "whatsapp";

interface StatusConfig {
  label: string;
  bg: string;
  text: string;
}

const statusMap: Record<OrderStatus, StatusConfig> = {
  pending: { label: "Pendiente", bg: "#FFF7ED", text: "#92400E" },
  paid: { label: "Pagado", bg: "#EEF7EB", text: "#2D6A1F" },
  kitchen: { label: "En cocina", bg: "#EFF6FF", text: "#1E40AF" },
  delivered: { label: "Entregado", bg: "#F0FDF4", text: "#166534" },
  expired: { label: "Expirada", bg: "#FEF2F2", text: "#B91C1C" },
  failed: { label: "Fallido", bg: "#FEF2F2", text: "#B91C1C" },
  whatsapp: { label: "WhatsApp", bg: "#F0FDF4", text: "#166534" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const config = statusMap[status] ?? {
    label: status,
    bg: "#F5F5F5",
    text: "#525252",
  };

  return (
    <Badge
      style={{ backgroundColor: config.bg, color: config.text }}
      className="border-transparent"
    >
      {config.label}
    </Badge>
  );
}

export type { OrderStatus };
