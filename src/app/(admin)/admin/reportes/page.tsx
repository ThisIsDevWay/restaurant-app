import { todayCaracas } from "@/lib/utils/date";
import {
  getHourlySalesCurve,
  getDailySalesHistory,
  getWeeklySales,
  getProductRanking,
  getPaymentMethodsSummary,
  getReconciliationReport,
  getIgtfSummary,
  getOrderLineDetail,
  getCashBreakdown,
  getIgtfTransactions,
} from "@/db/queries/reports";
import { getSettings } from "@/db/queries/settings";
import { ReportesClient } from "./ReportesClient";
import * as v from "valibot";
import { dateStringSchema } from "@/lib/validations/date";

/** Resta `days` días a una fecha 'YYYY-MM-DD' Caracas y devuelve 'YYYY-MM-DD'. */
function caracasDaysAgo(toDate: string, days: number): string {
  const ref = new Date(`${toDate}T00:00:00-04:00`);
  ref.setDate(ref.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(ref);
}

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const rawFrom = resolvedSearchParams.fromDate as string | undefined;
  const rawTo = resolvedSearchParams.toDate as string | undefined;
  const rawTab = resolvedSearchParams.tab as string | undefined;
  const rawRole = resolvedSearchParams.createdByRole as string | undefined;

  const today = todayCaracas();
  let toDate = today;
  let fromDate = caracasDaysAgo(toDate, 30);
  const activeTab = rawTab || "sales";
  
  let createdByRole: "admin" | "waiter" | "cashier" | null = null;
  if (rawRole === "admin" || rawRole === "waiter" || rawRole === "cashier") {
    createdByRole = rawRole;
  }

  if (rawTo) {
    const result = v.safeParse(dateStringSchema, rawTo);
    if (result.success) {
      toDate = result.output;
    }
  }

  if (rawFrom) {
    const result = v.safeParse(dateStringSchema, rawFrom);
    if (result.success) {
      fromDate = result.output;
    }
  }

  // Fetch all reports and settings in parallel
  const [
    hourly,
    daily,
    weekly,
    ranking,
    orderDetail,
    paymentMethods,
    cashBreakdown,
    reconciliation,
    igtf,
    igtfTransactions,
    settingsRow,
  ] = await Promise.all([
    getHourlySalesCurve(fromDate, toDate, createdByRole),
    getDailySalesHistory(fromDate, toDate, createdByRole),
    getWeeklySales(fromDate, toDate, createdByRole),
    getProductRanking(fromDate, toDate, 20, createdByRole),
    getOrderLineDetail(fromDate, toDate, createdByRole, 200),
    getPaymentMethodsSummary(fromDate, toDate, createdByRole),
    getCashBreakdown(fromDate, toDate, createdByRole),
    getReconciliationReport(fromDate, toDate, createdByRole),
    getIgtfSummary(fromDate, toDate, createdByRole),
    getIgtfTransactions(fromDate, toDate, createdByRole, 200),
    getSettings(),
  ]);

  const restaurantName = settingsRow?.restaurantName ?? "G&M";

  return (
    <ReportesClient
      fromDate={fromDate}
      toDate={toDate}
      activeTab={activeTab}
      createdByRole={createdByRole}
      restaurantName={restaurantName}
      salesData={{ hourly, daily, weekly, ranking }}
      orderDetail={orderDetail}
      paymentMethods={paymentMethods}
      cashBreakdown={cashBreakdown}
      reconciliation={reconciliation}
      igtf={igtf}
      igtfTransactions={igtfTransactions}
    />
  );
}
