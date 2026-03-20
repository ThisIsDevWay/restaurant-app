import { db } from "@/db";
import { orders } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatBs } from "@/lib/money";
import { obfuscatePhone } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { ConfirmPaymentButton } from "@/components/admin/orders/ConfirmPaymentButton";

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

function summarizeItems(snapshot: unknown): string {
  const items = snapshot as ItemsSnapshot;
  if (!Array.isArray(items) || items.length === 0) return "—";
  const names = items.map((i) => i.name);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} y ${names.length - 3} más`;
}

export default async function AdminOrdersPage() {
  const allOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main">Órdenes</h1>
        <p className="text-sm text-text-muted">
          Últimas {allOrders.length} órdenes
        </p>
      </div>

      <div className="overflow-hidden rounded-card border border-border bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg-app text-left">
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Fecha
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Teléfono
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Items
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Total
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Método
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Estado
                </th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold text-text-main">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {allOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-b-0"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {new Date(order.createdAt).toLocaleDateString("es-VE")}{" "}
                    <span className="text-xs">
                      {new Date(order.createdAt).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-main">
                    {obfuscatePhone(order.customerPhone)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-text-main">
                    {summarizeItems(order.itemsSnapshot)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-price-green">
                    {formatBs(order.subtotalBsCents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted capitalize">
                    {order.paymentMethod === "pago_movil"
                      ? "Pago Móvil"
                      : order.paymentMethod === "transfer"
                        ? "Transferencia"
                        : order.paymentMethod === "whatsapp"
                          ? "WhatsApp"
                          : order.paymentMethod}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {order.status === "whatsapp" && (
                      <ConfirmPaymentButton orderId={order.id} />
                    )}
                  </td>
                </tr>
              ))}
              {allOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-text-muted"
                  >
                    No hay órdenes aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
