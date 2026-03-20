"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBs } from "@/lib/money";
import { obfuscatePhone } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { ConfirmPaymentButton } from "@/components/admin/orders/ConfirmPaymentButton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Clock, ChefHat, CheckCircle2 } from "lucide-react";

type ItemsSnapshot = Array<{
  id: string;
  name: string;
  priceUsdCents: number;
  priceBsCents: number;
  selectedContorno: { id: string; name: string } | null;
  selectedAdicionales: Array<{
    id: string;
    name: string;
    priceUsdCents: number;
    priceBsCents: number;
  }>;
  quantity: number;
  itemTotalBsCents: number;
}>;

interface Order {
  id: string;
  status: string;
  subtotalBsCents: number;
  customerPhone: string;
  createdAt: Date;
  paymentMethod: string;
  itemsSnapshot: unknown;
}

function summarizeItems(snapshot: unknown): string {
  const items = snapshot as ItemsSnapshot;
  if (!Array.isArray(items) || items.length === 0) return "—";
  const names = items.map((i) => i.name);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}

type TabFilter = "all" | "pending" | "kitchen" | "history";

const tabs: Array<{ value: TabFilter; label: string; icon: typeof ShoppingBag }> = [
  { value: "all", label: "Todas", icon: ShoppingBag },
  { value: "pending", label: "Pendientes", icon: Clock },
  { value: "kitchen", label: "En Cocina", icon: ChefHat },
  { value: "history", label: "Historial", icon: CheckCircle2 },
];

export function OrdersClient({ orders }: { orders: Order[] }) {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filteredOrders = orders.filter((order) => {
    switch (activeTab) {
      case "pending":
        return order.status === "pending" || order.status === "whatsapp";
      case "kitchen":
        return order.status === "paid" || order.status === "kitchen";
      case "history":
        return order.status === "delivered" || order.status === "expired" || order.status === "failed";
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Órdenes</h1>
        <p className="text-sm text-text-muted">
          {orders.length} órdenes totales
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.value;
          const count = orders.filter((o) => {
            switch (tab.value) {
              case "pending":
                return o.status === "pending" || o.status === "whatsapp";
              case "kitchen":
                return o.status === "paid" || o.status === "kitchen";
              case "history":
                return o.status === "delivered" || o.status === "expired" || o.status === "failed";
              default:
                return true;
            }
          }).length;

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-text-muted hover:bg-bg-app hover:text-text-main ring-1 ring-border"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              <Badge
                className={`ml-1 text-[10px] h-5 px-1.5 ${
                  isActive
                    ? "bg-white/20 text-white border-transparent"
                    : "bg-bg-app text-text-muted border-transparent"
                }`}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <Card className="ring-1 ring-border">
        <CardContent className="p-0">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
                <ShoppingBag className="h-7 w-7 text-primary/40" />
              </div>
              <p className="text-sm font-medium text-text-main">Sin órdenes</p>
              <p className="text-xs text-text-muted mt-1">
                No hay órdenes en esta categoría
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-bg-app/50">
                  <TableHead className="font-semibold text-text-main pl-5">
                    Fecha
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Teléfono
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Items
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Total
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Método
                  </TableHead>
                  <TableHead className="font-semibold text-text-main">
                    Estado
                  </TableHead>
                  <TableHead className="font-semibold text-text-main text-right pr-5">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="border-border group">
                    <TableCell className="pl-5">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <span className="text-text-muted block">
                          {new Date(order.createdAt).toLocaleDateString("es-VE")}
                        </span>
                        <span className="text-xs text-text-muted">
                          {new Date(order.createdAt).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-text-main">
                        {obfuscatePhone(order.customerPhone)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-text-main max-w-[200px] truncate block">
                        {summarizeItems(order.itemsSnapshot)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-price-green">
                        {formatBs(order.subtotalBsCents)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {order.paymentMethod === "pago_movil"
                          ? "Pago Móvil"
                          : order.paymentMethod === "transfer"
                            ? "Transferencia"
                            : order.paymentMethod === "whatsapp"
                              ? "WhatsApp"
                              : order.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status as any} />
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/orders/${order.id}`}>
                          <Badge
                            variant="outline"
                            className="text-xs cursor-pointer hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors"
                          >
                            Ver detalle
                          </Badge>
                        </Link>
                        {order.status === "whatsapp" && (
                          <ConfirmPaymentButton orderId={order.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
