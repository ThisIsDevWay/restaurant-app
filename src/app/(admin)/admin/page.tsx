import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

export default async function AdminDashboard() {
  const [todayStats] = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orders.subtotalBsCents}), 0)::int`,
      completedOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('paid', 'kitchen', 'delivered'))::int`,
      pendingOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')::int`,
    })
    .from(orders)
    .where(
      sql`${orders.createdAt} >= CURRENT_DATE`,
    );

  const avgTicket =
    todayStats.completedOrders > 0
      ? Math.round(todayStats.totalSales / todayStats.completedOrders)
      : 0;

  const recentOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      subtotalBsCents: orders.subtotalBsCents,
      customerPhone: orders.customerPhone,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(10);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-text-main">Dashboard</h1>

      {/* Stats cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Ventas hoy"
          value={`Bs. ${(todayStats.totalSales / 100).toLocaleString("es-VE", {
            minimumFractionDigits: 2,
          })}`}
        />
        <StatCard
          label="Órdenes completadas"
          value={String(todayStats.completedOrders)}
        />
        <StatCard
          label="Pendientes"
          value={String(todayStats.pendingOrders)}
        />
        <StatCard
          label="Ticket promedio"
          value={`Bs. ${(avgTicket / 100).toLocaleString("es-VE", {
            minimumFractionDigits: 2,
          })}`}
        />
      </div>

      {/* Recent orders */}
      <div className="rounded-card border border-border bg-white shadow-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-main">
            Últimas órdenes
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-app text-left">
              <th className="px-4 py-2 font-semibold text-text-main">ID</th>
              <th className="px-4 py-2 font-semibold text-text-main">Monto</th>
              <th className="px-4 py-2 font-semibold text-text-main">Estado</th>
              <th className="px-4 py-2 font-semibold text-text-main">Hora</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-border last:border-b-0"
              >
                <td className="px-4 py-2 font-mono text-xs text-text-main">
                  #{order.id.slice(-4).toUpperCase()}
                </td>
                <td className="px-4 py-2 font-semibold text-price-green">
                  Bs. {(order.subtotalBsCents / 100).toLocaleString(
                    "es-VE",
                    { minimumFractionDigits: 2 },
                  )}
                </td>
                <td className="px-4 py-2">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-2 text-xs text-text-muted">
                  {new Date(order.createdAt).toLocaleTimeString("es-VE")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-4 py-3">
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas las órdenes →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-white p-4 shadow-card">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-text-main">{value}</p>
    </div>
  );
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber/10", text: "text-amber", label: "Pendiente" },
  paid: { bg: "bg-success/10", text: "text-success", label: "Pagado" },
  kitchen: { bg: "bg-info/10", text: "text-info", label: "En cocina" },
  delivered: { bg: "bg-success/10", text: "text-success", label: "Entregado" },
  expired: { bg: "bg-error/10", text: "text-error", label: "Expirado" },
  failed: { bg: "bg-error/10", text: "text-error", label: "Fallido" },
  whatsapp: { bg: "bg-green-100", text: "text-green-700", label: "WhatsApp" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.pending;
  return (
    <span
      className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-semibold ${colors.bg} ${colors.text}`}
    >
      {colors.label}
    </span>
  );
}
