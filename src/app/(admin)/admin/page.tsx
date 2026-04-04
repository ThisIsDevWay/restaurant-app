import Link from "next/link";
import { sql } from "drizzle-orm";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBs, formatRef } from "@/lib/money";
import { OrdersChart } from "@/components/admin/dashboard/OrdersChart";
import { OrderStatusBadge } from "@/components/admin/orders/OrderStatusBadge";
import { todayCaracas } from "@/lib/utils/date";
import { and, gte, lte, desc } from "drizzle-orm";
import { getWeightedAverageMarginToday, getMenuItemProfitability, getStaleCostItems } from "@/db/queries/menu";
import { getDashboardStats, getRecentOrders, getTodayOrdersRaw } from "@/db/queries/dashboard";

export default async function AdminDashboard() {
  const [todayStats, recentOrders, todayOrdersRaw] = await Promise.all([
    getDashboardStats(),
    getRecentOrders(10),
    getTodayOrdersRaw(),
  ]);

  const avgTicket =
    todayStats.completedOrders > 0
      ? Math.round(todayStats.totalSales / todayStats.completedOrders)
      : 0;

  const itemCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const row of todayOrdersRaw) {
    const snapshot = row.itemsSnapshot as Array<{ id: string; name: string; quantity: number }>;
    for (const item of snapshot) {
      if (!item.id) continue;
      const existing = itemCounts.get(item.id);
      if (existing) {
        existing.count += item.quantity;
      } else {
        itemCounts.set(item.id, { id: item.id, name: item.name, count: item.quantity });
      }
    }
  }
  const topProduct = [...itemCounts.values()].sort((a, b) => b.count - a.count)[0] ?? null;

  // Peak hour today
  const hourCounts = new Map<number, number>();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    hour: "numeric",
    hour12: false,
  });

  for (const row of todayOrdersRaw) {
    let hour = parseInt(formatter.format(new Date(row.createdAt)), 10);
    if (hour === 24) hour = 0;
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
  }
  const peakHourEntry = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0].toString().padStart(2, "0")}:00` : null;

  // Profitability data
  const [weightedMargin, profitability, staleItems] = await Promise.all([
    getWeightedAverageMarginToday(),
    getMenuItemProfitability(),
    getStaleCostItems(7),
  ]);

  // Items with cost, sorted by margin ascending (worst first)
  const rankedByMargin = profitability
    .filter((i) => i.marginPct !== null)
    .sort((a, b) => (a.marginPct ?? 0) - (b.marginPct ?? 0));

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
      tooltip: "Total de ingresos brutos por ventas confirmadas el día de hoy.",
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
      tooltip: "Órdenes que han sido pagadas, preparadas o entregadas hoy.",
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
      tooltip: "Órdenes esperando por confirmación o pago.",
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
      tooltip: "Gasto promedio por cliente en las órdenes completadas hoy.",
    },
    {
      label: "Más pedido",
      value: topProduct ? `${topProduct.name}` : "—",
      icon: Star,
      change: topProduct ? `${topProduct.count} uds` : "—",
      positive: true,
      gradient: "from-primary/5 to-primary/10",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      tooltip: "Producto con mayor volumen de ventas (unidades) hoy.",
    },
    {
      label: "Hora pico",
      value: peakHour ?? "—",
      icon: BarChart3,
      change: peakHourEntry ? `${peakHourEntry[1]} pedidos` : "—",
      positive: true,
      gradient: "from-info/5 to-info/10",
      iconBg: "bg-info/10",
      iconColor: "text-info",
      tooltip: "Hora con mayor registro de pedidos hoy (Hora local Caracas).",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
        <p className="text-sm text-text-muted">Resumen de actividad de hoy</p>
      </div>

      <TooltipProvider>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <Tooltip key={stat.label}>
              <TooltipTrigger asChild>
                <Card
                  className={`relative overflow-hidden bg-gradient-to-br ${stat.gradient} border-0 ring-1 ring-border cursor-help`}
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
                        className={`text-xs font-medium ${stat.positive ? "text-success" : "text-error"
                          }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-text-muted">vs ayer</span>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p>{stat.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

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
                      {order.customerPhone}
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

      {/* Rentabilidad */}
      <Card className="ring-1 ring-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Rentabilidad por plato</CardTitle>
            {weightedMargin.weightedMarginPct !== null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      className={`text-xs cursor-help ${weightedMargin.weightedMarginPct >= 40
                        ? "bg-green-100 text-green-700"
                        : weightedMargin.weightedMarginPct >= 20
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      Margen ponderado hoy: {weightedMargin.weightedMarginPct}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Promedio de ganancia neta basado en la mezcla de productos vendidos hoy y sus costos snapshot.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rankedByMargin.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-3 h-10 w-10 text-text-muted/40" />
              <p className="text-sm font-medium text-text-main">Sin datos de costo</p>
              <p className="text-xs text-text-muted mt-1">
                Agrega el costo estimado a tus productos para ver la rentabilidad
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {rankedByMargin.map((item) => {
                const marginPct = item.marginPct ?? 0;
                const isStale = item.costUpdatedAt
                  ? Date.now() - new Date(item.costUpdatedAt).getTime() > 7 * 24 * 60 * 60 * 1000
                  : true;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-bg-app/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${marginPct >= 40
                          ? "bg-green-500"
                          : marginPct >= 20
                            ? "bg-yellow-500"
                            : "bg-red-500"
                          }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-main truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-text-muted">
                          {formatRef(item.priceUsdCents)} · costo {formatRef(item.costUsdCents ?? 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isStale && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-3.5 w-3.5 text-amber cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Este costo no ha sido actualizado en más de 7 días. Podría no ser preciso.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <span
                        className={`text-sm font-bold ${marginPct >= 40
                          ? "text-green-600"
                          : marginPct >= 20
                            ? "text-yellow-600"
                            : "text-red-600"
                          }`}
                      >
                        {marginPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stale cost alerts */}
          {staleItems.length > 0 && (
            <div className="border-t border-border bg-amber/5 px-5 py-3">
              <p className="text-xs font-semibold text-amber flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {staleItems.length} {staleItems.length === 1 ? "producto con costo desactualizado" : "productos con costo desactualizado"}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Actualiza los costos semanalmente para márgenes precisos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
