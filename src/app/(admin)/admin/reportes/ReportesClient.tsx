"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, RefreshCw, Layers, Printer } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import {
  generateSalesDetailPdf,
  generateCashBreakdownPdf,
  generateReconciliationPdf,
  generateIgtfPdf,
} from "@/lib/report-pdf-builder";

// Chart components
import { HourlySalesChart } from "@/components/admin/reports/HourlySalesChart";
import { DailySalesChart } from "@/components/admin/reports/DailySalesChart";
import { WeeklySalesChart } from "@/components/admin/reports/WeeklySalesChart";
import { ProductRankingTable } from "@/components/admin/reports/ProductRankingTable";

// New granular components
import { OrderDetailTable } from "@/components/admin/reports/OrderDetailTable";
import { CashBreakdownTable } from "@/components/admin/reports/CashBreakdownTable";

import type {
  HourlySalesRow,
  DailySalesRow,
  WeeklySalesRow,
  ProductRankingRow,
  PaymentMethodSummaryRow,
  ReconciliationReportRow,
  IgtfSummaryRow,
  OrderLineDetailRow,
  CashBreakdownRow,
  IgtfTransactionRow,
} from "@/db/queries/reports";
import { obfuscatePhone, formatOrderDate } from "@/lib/utils";

const MODE_TRANSLATIONS: Record<string, string> = {
  on_site: "Comer en el local",
  dine_in: "Comer en el local",
  take_away: "Retiro en local",
  pickup: "Retiro en local",
  delivery: "Delivery",
};

interface ReportesClientProps {
  fromDate: string;
  toDate: string;
  activeTab: string;
  createdByRole: string | null;
  restaurantName: string;
  salesData: {
    hourly: HourlySalesRow[];
    daily: DailySalesRow[];
    weekly: WeeklySalesRow[];
    ranking: ProductRankingRow[];
  };
  orderDetail: OrderLineDetailRow[];
  paymentMethods: PaymentMethodSummaryRow[];
  cashBreakdown: CashBreakdownRow[];
  reconciliation: ReconciliationReportRow[];
  igtf: IgtfSummaryRow[];
  igtfTransactions: IgtfTransactionRow[];
}

function getRoleLabel(role: string | null): string {
  if (!role) return "Todas las Estaciones";
  switch (role) {
    case "cashier": return "Caja / Cajeros";
    case "waiter": return "Meseros";
    case "admin": return "Administradores";
    default: return role;
  }
}

export function ReportesClient({
  fromDate,
  toDate,
  activeTab,
  createdByRole,
  restaurantName,
  salesData,
  orderDetail,
  paymentMethods,
  cashBreakdown,
  reconciliation,
  igtf,
  igtfTransactions,
}: ReportesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const [localFrom, setLocalFrom] = useState(fromDate);
  const [localTo, setLocalTo] = useState(toDate);
  const [localRole, setLocalRole] = useState(createdByRole || "all");
  const [isPrinting, setIsPrinting] = useState(false);

  const pdfMeta = {
    restaurantName: restaurantName,
    fromDate: localFrom,
    toDate: localTo,
    roleLabel: getRoleLabel(localRole === "all" ? null : localRole),
  };

  function updateFilters(from: string, to: string, role = localRole, tabValue = activeTab) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("fromDate", from);
      params.set("toDate", to);
      params.set("tab", tabValue);
      if (role && role !== "all") {
        params.set("createdByRole", role);
      } else {
        params.delete("createdByRole");
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleTabChange(tabValue: string) {
    updateFilters(localFrom, localTo, localRole, tabValue);
  }

  function handlePreset(days: number) {
    const to = new Date().toLocaleDateString("en-CA", { timeZone: "America/Caracas" });
    const fromRef = new Date();
    fromRef.setDate(fromRef.getDate() - days);
    const from = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas" }).format(fromRef);
    setLocalFrom(from);
    setLocalTo(to);
    updateFilters(from, to, localRole);
  }

  async function handlePrint() {
    setIsPrinting(true);
    try {
      let blob: Blob;

      switch (activeTab) {
        case "sales":
          blob = await generateSalesDetailPdf(orderDetail, pdfMeta);
          break;
        case "cash":
          blob = await generateCashBreakdownPdf(cashBreakdown, pdfMeta);
          break;
        case "reconcile":
          blob = await generateReconciliationPdf(reconciliation, pdfMeta);
          break;
        case "igtf":
          blob = await generateIgtfPdf(igtfTransactions, igtf, pdfMeta);
          break;
        default:
          blob = await generateSalesDetailPdf(orderDetail, pdfMeta);
      }

      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `reporte-${activeTab}-${localFrom}-al-${localTo}.pdf`;
        a.click();
      }
    } catch {
      // PDF generation error — silently fail
    } finally {
      setIsPrinting(false);
    }
  }

  // Summary KPIs
  const totalSalesBs = paymentMethods.reduce((s, p) => s + p.totalBsCents, 0);
  const totalSalesUsd = paymentMethods.reduce((s, p) => s + p.totalUsdCents, 0);
  const totalOrders = paymentMethods.reduce((s, p) => s + p.orderCount, 0);

  const reconciliationStats = {
    reconciled: reconciliation.filter((r) => r.type === "reconciled").length,
    manual: reconciliation.filter((r) => r.type === "manual_no_sms").length,
    orphan: reconciliation.filter((r) => r.type === "orphan_sms").length,
    conflict: reconciliation.filter((r) => r.type === "ambiguous_collision" || r.type === "amount_mismatch").length,
  };

  const totalIgtfBs = igtf.reduce((s, i) => s + i.totalIgtfBsCents, 0);
  const totalIgtfUsd = igtf.reduce((s, i) => s + i.totalIgtfUsdCents, 0);

  const tabPdfLabels: Record<string, string> = {
    sales: "Ventas",
    cash: "Arqueo",
    reconcile: "Conciliación",
    igtf: "IGTF",
  };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main font-epilogue">Reportes</h1>
          <p className="text-sm text-text-muted mt-1">
            Análisis detallado con composición de producto, origen de canal y auditoría transaccional.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 bg-white p-2 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-text-muted px-1.5">Caja:</span>
            <select
              value={localRole}
              onChange={(e) => {
                const val = e.target.value;
                setLocalRole(val);
                updateFilters(localFrom, localTo, val);
              }}
              className="h-8 text-xs border border-border rounded-lg bg-bg-app px-2 font-semibold text-text-main focus-visible:ring-1 focus-visible:ring-primary outline-none"
            >
              <option value="all">Todas</option>
              <option value="cashier">Caja</option>
              <option value="waiter">Meseros</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="h-4 w-px bg-border hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="h-8 text-xs border-border tabular-nums bg-bg-app"
            />
            <span className="text-text-muted text-xs">al</span>
            <Input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="h-8 text-xs border-border tabular-nums bg-bg-app"
            />
          </div>

          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => updateFilters(localFrom, localTo, localRole)}
              className="h-8 px-3 text-xs bg-bg-app border-border font-medium">
              Aplicar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePreset(0)}
              className="h-8 px-2 text-xs text-text-muted font-medium hover:bg-bg-app">
              Hoy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePreset(7)}
              className="h-8 px-2 text-xs text-text-muted font-medium hover:bg-bg-app">
              7d
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePreset(15)}
              className="h-8 px-2 text-xs text-text-muted font-medium hover:bg-bg-app">
              15d
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handlePreset(30)}
              className="h-8 px-2 text-xs text-text-muted font-medium hover:bg-bg-app">
              30d
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground border-transparent shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              {isPrinting ? "..." : `PDF ${tabPdfLabels[activeTab] ?? ""}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6 overflow-x-auto">
          {[
            { id: "sales", label: "Ventas y Detalle", icon: TrendingUp },
            { id: "cash", label: "Arqueo de Caja", icon: DollarSign },
            { id: "reconcile", label: "Conciliación Bancaria", icon: RefreshCw },
            { id: "igtf", label: "Impuesto IGTF", icon: Layers },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors cursor-pointer ${active
                    ? "border-primary text-primary"
                    : "border-transparent text-text-muted hover:text-text-main"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className={`transition-opacity duration-200 ${isPending ? "opacity-60" : "opacity-100"}`}>

        {/* ═══ TAB: VENTAS Y DETALLE ═══ */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase tracking-wider">Facturación Total</div>
                  <div className="text-2xl font-bold mt-1 text-text-main tabular-nums">{formatBs(totalSalesBs)}</div>
                  <div className="text-sm text-primary font-medium mt-0.5 tabular-nums">Ref. {formatRef(totalSalesUsd)}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase tracking-wider">Pedidos</div>
                  <div className="text-2xl font-bold mt-1 text-text-main tabular-nums">{totalOrders}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase tracking-wider">Ticket Promedio</div>
                  <div className="text-2xl font-bold mt-1 text-text-main tabular-nums">
                    {totalOrders > 0 ? formatBs(Math.round(totalSalesBs / totalOrders)) : "Bs. 0"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="ring-1 ring-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="font-epilogue text-text-main text-lg font-bold">Curva de ventas por hora</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <HourlySalesChart data={salesData.hourly} />
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="font-epilogue text-text-main text-lg font-bold">Ventas diarias</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <DailySalesChart data={salesData.daily} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="ring-1 ring-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="font-epilogue text-text-main text-lg font-bold">Tendencia semanal</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <WeeklySalesChart data={salesData.weekly} />
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm">
                <CardHeader className="border-b border-border pb-3">
                  <CardTitle className="font-epilogue text-text-main text-lg font-bold">Top 20 productos</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ProductRankingTable data={salesData.ranking} />
                </CardContent>
              </Card>
            </div>

            {/* Order Detail Table — the real granular view */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">
                  Detalle por Orden — Composición Completa
                </CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Click en una fila para expandir y ver contornos, bebidas, adicionales, sustituciones y removidos.
                  Mostrando los últimos {orderDetail.length} pedidos del rango.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <OrderDetailTable data={orderDetail} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: ARQUEO DE CAJA ═══ */}
        {activeTab === "cash" && (
          <div className="space-y-6">
            {/* Method summary (existing simple table) */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">
                  Resumen por Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-text-main text-left min-w-[700px]">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                        <th className="px-4 py-3 font-semibold">Método</th>
                        <th className="px-4 py-3 font-semibold">Proveedor</th>
                        <th className="px-4 py-3 font-semibold text-right">Pedidos</th>
                        <th className="px-4 py-3 font-semibold text-right">Bs</th>
                        <th className="px-4 py-3 font-semibold text-right">USD Ref</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paymentMethods.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 px-4 text-center text-text-muted">Sin transacciones</td>
                        </tr>
                      ) : (
                        <>
                          {paymentMethods.map((row, idx) => (
                            <tr key={idx} className="hover:bg-bg-app/50 font-medium border-b border-border/40">
                              <td className="px-4 py-3">{row.paymentMethod}</td>
                              <td className="px-4 py-3 text-text-muted capitalize">{row.paymentProvider.replace(/_/g, " ")}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatBs(row.totalBsCents)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatRef(row.totalUsdCents)}</td>
                            </tr>
                          ))}
                          <tr className="font-bold border-t-2 border-border bg-bg-app/20 text-text-main">
                            <td className="px-4 py-4" colSpan={2}>TOTAL</td>
                            <td className="px-4 py-4 text-right tabular-nums">{totalOrders}</td>
                            <td className="px-4 py-4 text-right tabular-nums">{formatBs(totalSalesBs)}</td>
                            <td className="px-4 py-4 text-right tabular-nums">{formatRef(totalSalesUsd)}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Granular Breakdown: method → channel → mode */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">
                  Desglose: Método → Canal → Modo
                </CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Expanda cada método de pago para ver de dónde provienen los pedidos (Web, Caja, Mesero) y su modo de entrega (En sitio, Para llevar, Delivery).
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <CashBreakdownTable data={cashBreakdown} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: CONCILIACIÓN BANCARIA ═══ */}
        {activeTab === "reconcile" && (
          <div className="space-y-6">
            {/* KPI stats */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card className="ring-1 ring-border shadow-sm border-l-4 border-l-success">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">Conciliados</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{reconciliationStats.reconciled}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm border-l-4 border-l-amber-500">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">Manual Sin SMS</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{reconciliationStats.manual}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm border-l-4 border-l-slate-400">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">Huérfanas</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{reconciliationStats.orphan}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm border-l-4 border-l-red-500">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">Conflictos</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{reconciliationStats.conflict}</div>
                </CardContent>
              </Card>
            </div>

            {/* Full reconciliation table with context */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">
                  Auditoría Cruzada de Transacciones
                </CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Cada fila muestra la relación entre una notificación bancaria y el pedido del sistema, con contexto completo: cliente, canal de origen, modo de entrega y montos comparados.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left text-text-main min-w-[1000px] table-auto">
                    <thead>
                      <tr className="border-b border-border uppercase tracking-wide text-text-muted font-semibold text-[10px]">
                        <th className="px-3 py-2.5">Estado</th>
                        <th className="px-3 py-2.5"># Orden</th>
                        <th className="px-3 py-2.5 text-right">Fecha</th>
                        <th className="px-3 py-2.5">Cliente</th>
                        <th className="px-3 py-2.5 text-center">Canal</th>
                        <th className="px-3 py-2.5">Modo</th>
                        <th className="px-3 py-2.5">Pago</th>
                        <th className="px-3 py-2.5 text-right">Monto Pedido</th>
                        <th className="px-3 py-2.5 text-right border-l border-border/60 bg-bg-app/40 font-semibold text-text-main">Monto Banco</th>
                        <th className="px-4 py-2.5 bg-bg-app/40 font-semibold text-text-main">Ref. Banco</th>
                        <th className="px-3 py-2.5 bg-bg-app/40 font-semibold text-text-main">Fuente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reconciliation.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 px-3 text-center text-sm text-text-muted">
                            Sin transacciones bancarias en el rango
                          </td>
                        </tr>
                      ) : (
                        reconciliation.map((row, idx) => {
                          const badges: Record<string, { cls: string; label: string }> = {
                            reconciled: { cls: "bg-green-100 text-green-800 border-green-200", label: "Conciliado" },
                            manual_no_sms: { cls: "bg-amber-100 text-amber-800 border-amber-200", label: "Manual" },
                            orphan_sms: { cls: "bg-slate-100 text-slate-800 border-slate-200", label: "Huérfano" },
                            ambiguous_collision: { cls: "bg-red-100 text-red-800 border-red-200 animate-pulse", label: "Colisión" },
                            amount_mismatch: { cls: "bg-red-100 text-red-800 border-red-200", label: "Monto ≠" },
                          };
                          const b = badges[row.type] ?? badges.reconciled;
                          const amountMismatch = row.orderTotalBsCents && row.notificationAmountBsCents
                            && row.orderTotalBsCents !== row.notificationAmountBsCents;

                          return (
                            <tr key={idx} className="hover:bg-bg-app/50 font-medium border-b border-border/40">
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${b.cls}`}>
                                  {b.label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 font-bold">{row.orderNumber ? `#${row.orderNumber}` : "—"}</td>
                              <td className="px-3 py-2.5 text-right tabular-nums text-text-muted">{formatOrderDate(row.createdAt)}</td>
                              <td className="px-3 py-2.5 max-w-[140px] truncate">
                                {row.customerName || (row.customerPhone ? obfuscatePhone(row.customerPhone) : "—")}
                              </td>
                              <td className="px-3 py-2.5 text-center text-text-muted">{row.channel || "—"}</td>
                              <td className="px-3 py-2.5 text-text-muted">
                                {row.orderMode ? (MODE_TRANSLATIONS[row.orderMode.toLowerCase()] || row.orderMode) : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-text-muted">{row.paymentMethod || "—"}</td>
                              <td className={`px-3 py-2.5 text-right tabular-nums ${amountMismatch ? "text-red-600 font-bold" : ""}`}>
                                {row.orderTotalBsCents ? formatBs(row.orderTotalBsCents) : "—"}
                              </td>
                              <td className={`px-3 py-2.5 text-right tabular-nums border-l border-border/60 bg-bg-app/10 ${amountMismatch ? "text-red-600 font-bold" : ""}`}>
                                {row.notificationAmountBsCents ? formatBs(row.notificationAmountBsCents) : "—"}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-text-muted bg-bg-app/10">{row.notificationReference || "—"}</td>
                              <td className="px-3 py-2.5 text-text-muted capitalize bg-bg-app/10">{row.notificationSource || "—"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ TAB: IGTF ═══ */}
        {activeTab === "igtf" && (
          <div className="space-y-6">
            {/* IGTF KPIs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="ring-1 ring-border shadow-sm border-l-4 border-l-primary">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">IGTF Recaudado</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{formatBs(totalIgtfBs)}</div>
                  <div className="text-sm text-primary font-medium mt-0.5 tabular-nums">Ref. {formatRef(totalIgtfUsd)}</div>
                </CardContent>
              </Card>
              <Card className="ring-1 ring-border shadow-sm">
                <CardContent className="pt-4">
                  <div className="text-xs text-text-muted font-medium uppercase">Transacciones con IGTF</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{igtfTransactions.length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Daily summary */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">Resumen Diario IGTF</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-text-main min-w-[800px]">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted font-semibold">
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3 text-right">Pedidos</th>
                        <th className="px-4 py-3 text-right">IGTF (Bs)</th>
                        <th className="px-4 py-3 text-right">IGTF (USD)</th>
                        <th className="px-4 py-3 text-right">Venta (Bs)</th>
                        <th className="px-4 py-3 text-right">Venta (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {igtf.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 px-4 text-center text-text-muted">Sin IGTF en este periodo</td>
                        </tr>
                      ) : (
                        <>
                          {igtf.map((row, idx) => (
                            <tr key={idx} className="hover:bg-bg-app/50 font-medium border-b border-border/40">
                              <td className="px-4 py-3 tabular-nums">{row.date}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{row.orderCount}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-success">{formatBs(row.totalIgtfBsCents)}</td>
                              <td className="px-4 py-3 text-right tabular-nums text-success">{formatRef(row.totalIgtfUsdCents)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatBs(row.totalSalesBsCents)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatRef(row.totalSalesUsdCents)}</td>
                            </tr>
                          ))}
                          <tr className="font-bold border-t-2 border-border bg-bg-app/20 text-text-main">
                            <td className="px-4 py-4">TOTAL</td>
                            <td className="px-4 py-4 text-right tabular-nums">{igtf.reduce((s, i) => s + i.orderCount, 0)}</td>
                            <td className="px-4 py-4 text-right tabular-nums text-success">{formatBs(totalIgtfBs)}</td>
                            <td className="px-4 py-4 text-right tabular-nums text-success">{formatRef(totalIgtfUsd)}</td>
                            <td className="px-4 py-4 text-right tabular-nums">{formatBs(igtf.reduce((s, i) => s + i.totalSalesBsCents, 0))}</td>
                            <td className="px-4 py-4 text-right tabular-nums">{formatRef(igtf.reduce((s, i) => s + i.totalSalesUsdCents, 0))}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Individual transactions */}
            <Card className="ring-1 ring-border shadow-sm">
              <CardHeader className="border-b border-border">
                <CardTitle className="font-epilogue text-text-main text-lg font-bold">
                  Transacciones Individuales con IGTF
                </CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Respaldo operacional transacción por transacción. No constituye un documento fiscal SENIAT.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-text-main min-w-[900px]">
                    <thead>
                      <tr className="border-b border-border uppercase tracking-wide text-text-muted font-semibold text-[10px]">
                        <th className="px-4 py-2.5"># Orden</th>
                        <th className="px-4 py-2.5">Cliente</th>
                        <th className="px-4 py-2.5">Canal</th>
                        <th className="px-4 py-2.5">Método</th>
                        <th className="px-4 py-2.5 text-right">Venta (Bs)</th>
                        <th className="px-4 py-2.5 text-right">IGTF (Bs)</th>
                        <th className="px-4 py-2.5 text-right">IGTF (USD)</th>
                        <th className="px-4 py-2.5 text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {igtfTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 px-4 text-center text-sm text-text-muted">
                            Sin transacciones IGTF
                          </td>
                        </tr>
                      ) : (
                        igtfTransactions.map((t, idx) => (
                          <tr key={idx} className="hover:bg-bg-app/50 font-medium border-b border-border/40">
                            <td className="px-4 py-2.5 font-bold">#{t.orderNumber}</td>
                            <td className="px-4 py-2.5">{t.customerName || obfuscatePhone(t.customerPhone)}</td>
                            <td className="px-4 py-2.5 text-text-muted">{t.channel}</td>
                            <td className="px-4 py-2.5 text-text-muted">{t.paymentMethod}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatBs(t.grandTotalBsCents)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-success font-bold">{formatBs(t.igtfBsCents)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-success">{formatRef(t.igtfUsdCents)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-text-muted">{formatOrderDate(t.createdAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
