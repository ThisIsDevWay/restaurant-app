import { Badge } from "@/components/ui/badge";
import { STATUS_STYLES, type OrderStatus } from "@/lib/constants/order-status";

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const config = STATUS_STYLES[status as OrderStatus] ?? {
    label: status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge className={`status-badge ${config.className}`}>
      {config.label}
    </Badge>
  );
}
