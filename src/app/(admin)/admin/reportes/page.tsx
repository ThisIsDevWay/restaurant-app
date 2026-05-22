import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { todayCaracas } from "@/lib/utils/date";
import {
  getHourlySalesCurve,
  getDailySalesHistory,
  getWeeklySales,
  getProductRanking,
} from "@/db/queries/reports";
import { HourlySalesChart } from "@/components/admin/reports/HourlySalesChart";
import { DailySalesChart } from "@/components/admin/reports/DailySalesChart";
import { WeeklySalesChart } from "@/components/admin/reports/WeeklySalesChart";
import { ProductRankingTable } from "@/components/admin/reports/ProductRankingTable";

/** Resta `days` días a una fecha 'YYYY-MM-DD' Caracas y devuelve 'YYYY-MM-DD'. */
function caracasDaysAgo(toDate: string, days: number): string {
  const ref = new Date(`${toDate}T00:00:00-04:00`);
  ref.setDate(ref.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
  }).format(ref);
}

export default async function ReportesPage() {
  const toDate = todayCaracas();
  const fromDate = caracasDaysAgo(toDate, 30);

  const [hourly, daily, weekly, ranking] = await Promise.all([
    getHourlySalesCurve(fromDate, toDate),
    getDailySalesHistory(fromDate, toDate),
    getWeeklySales(fromDate, toDate),
    getProductRanking(fromDate, toDate, 20),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-epilogue text-2xl font-bold text-ink">Reportes</h1>
        <p className="text-sm text-text-muted">
          Últimos 30 días · {fromDate} → {toDate}
        </p>
      </div>

      {/* Fila 1: curva horaria · ventas diarias */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="ring-1 ring-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-epilogue text-ink">
              Curva de ventas por hora
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <HourlySalesChart data={hourly} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-epilogue text-ink">Ventas diarias</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <DailySalesChart data={daily} />
          </CardContent>
        </Card>
      </div>

      {/* Fila 2: tendencia semanal · top 20 productos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="ring-1 ring-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-epilogue text-ink">Tendencia semanal</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <WeeklySalesChart data={weekly} />
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="font-epilogue text-ink">Top 20 productos</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ProductRankingTable data={ranking} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
