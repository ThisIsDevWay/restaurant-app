import Link from "next/link";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBs } from "@/lib/money";
import { OrdersChart } from "@/components/admin/dashboard/OrdersChart";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";

export default async function AdminDashboard() {
  const [todayStats] = await db
    .select({
      totalSales: sql<number>`COALESCE(SUM(${orders.subtotalBsCents}), 0)::int`,
      completedOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('paid', 'kitchen', 'delivered'))::int`,
      pendingOrders: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'pending')::int`,
    })
    .from(orders)
    .where(sql`${orders.createdAt} >= CURRENT_DATE`);

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

  const stats = [
    {
      label: "Ventas hoy",
      value: formatBs(todayStats.totalSales),
      icon: DollarSign,
      change: "+12%",
      positive: true,
      gradient: "from-primary/5 to-primary/10",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
    },
    {
      label: "Completadas",
      value: String(todayStats.completedOrders),
      icon: CheckCircle2,
      change: "+8%",
      positive: true,
      gradient: "from-success/5 to-success/10",
      iconBg: "bg-success/10",
      iconColor: "text-success",
    },
    {
      label: "Pendientes",
      value: String(todayStats.pendingOrders),
      icon: Clock,
      change: todayStats.pendingOrders > 5 ? "+3" : "—",
      positive: false,
      gradient: "from-amber/5 to-amber/10",
      iconBg: "bg-amber/10",
      iconColor: "text-amber",
    },
    {
      label: "Ticket promedio",
      value: formatBs(avgTicket),
      icon: TrendingUp,
      change: "+5%",
      positive: true,
      gradient: "from-info/5 to-info/10",
      iconBg: "bg-info/10",
      iconColor: "text-info",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
        <p className="text-sm text-text-muted">Resumen de actividad de hoy</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-0 ring-1 ring-border`}
          >
            <CardContent className="pb-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-text-main tracking-tight">
                    {stat.value}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5">
                {stat.positive ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-error" />
                )}
                <span
                  className={`text-xs font-medium ${
                    stat.positive ? "text-success" : "text-error"
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-xs text-text-muted">vs ayer</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="ring-1 ring-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Ventas de la semana</CardTitle>
            <Badge variant="secondary" className="text-xs">
              Últimos 7 días
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <OrdersChart />
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card className="ring-1 ring-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Últimas órdenes</CardTitle>
            <Badge variant="outline" className="text-xs">
              {recentOrders.length} recientes
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-3 h-10 w-10 text-text-muted/40" />
              <p className="text-sm font-medium text-text-main">Sin órdenes aún</p>
              <p className="text-xs text-text-muted mt-1">
                Las órdenes aparecerán aquí cuando los clientes realicen pedidos
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-app/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-semibold text-text-main bg-bg-app rounded-lg px-2 py-1 shrink-0">
                      #{order.id.slice(-4).toUpperCase()}
                    </span>
                    <span className="text-sm text-text-muted truncate">
                      {order.customerPhone.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-price-green">
                      {formatBs(order.subtotalBsCents)}
                    </span>
                    <OrderStatusBadge status={order.status as any} />
                    <span className="text-xs text-text-muted hidden sm:block">
                      {new Date(order.createdAt).toLocaleTimeString("es-VE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver todas las órdenes →
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
