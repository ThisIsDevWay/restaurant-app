/**
 * Reportes históricos / analíticos — derivados de la ingeniería inversa del
 * sistema legacy a2 Softway (BD `omniviveres`).
 *
 * Estos reportes cubren los GAPS detectados frente al dashboard actual
 * (getDashboardStats / getMenuItemProfitability / getWeightedAverageMarginToday),
 * que solo operan sobre el día en curso.
 *
 * Convenciones del proyecto respetadas:
 *  - Dinero SIEMPRE en céntimos (integer). Nunca se divide entre 100 aquí.
 *  - Fechas: `created_at` se almacena en UTC; todo agrupamiento/looker se hace
 *    en `America/Caracas` vía `AT TIME ZONE` (Venezuela = UTC-4 fijo, sin DST).
 *  - "Venta real" = status IN ('paid','kitchen','delivered'), idéntico criterio
 *    a getDashboardStats(). 'cancelled'/'expired'/'failed'/'pending'/'whatsapp'
 *    NO suman ventas.
 *  - SUM por bucket (día/semana/hora) se castea ::int — cabe holgadamente en
 *    int4 incluso a rango multi-anual a los volúmenes actuales (~$2k/día máx).
 *  - Reportes a nivel de ítem expanden `items_snapshot` (jsonb) con
 *    jsonb_to_recordset. Claves del snapshot tipadas en schema/orders.ts:
 *    { id: string, name: string, quantity: number, itemTotalBsCents: number }.
 */

import { db } from "../index";
import { orders } from "../schema";
import { sql, and, desc } from "drizzle-orm";

/** Filtro SQL reutilizable: solo documentos que cuentan como venta. */
const SALE_STATUSES = sql`${orders.status} IN ('paid','kitchen','delivered')`;

/** `created_at` proyectado a hora local de Caracas. */
const LOCAL_TS = sql`(${orders.createdAt} AT TIME ZONE 'America/Caracas')`;
/** Fecha local (date) de Caracas. */
const LOCAL_DATE = sql`((${orders.createdAt} AT TIME ZONE 'America/Caracas')::date)`;

/** Normaliza el retorno de db.execute (postgres-js devuelve un array). */
function asRows(res: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(res)) return res as Array<Record<string, unknown>>;
  const maybe = res as { rows?: unknown };
  return Array.isArray(maybe.rows)
    ? (maybe.rows as Array<Record<string, unknown>>)
    : [];
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #1 — Curva de ventas por hora (valor operativo 5)
// Legacy 1c. No existe en gm-app. Clave para staffing/prep en un local de
// almuerzo cuyo 95% de ventas ocurre entre las 11h y 16h.
// ───────────────────────────────────────────────────────────────────────────

export interface HourlySalesRow {
  hour: number; // 0-23 (hora local Caracas)
  orderCount: number;
  grossTotalBsCents: number; // integer (céntimos Bs)
  avgTicketBsCents: number; // integer (céntimos Bs)
}

export async function getHourlySalesCurve(
  fromDate: string, // 'YYYY-MM-DD' (fecha Caracas, inclusive)
  toDate: string, // 'YYYY-MM-DD' (fecha Caracas, inclusive)
): Promise<HourlySalesRow[]> {
  const hourExpr = sql<number>`EXTRACT(HOUR FROM ${LOCAL_TS})::int`;

  return db
    .select({
      hour: hourExpr,
      orderCount: sql<number>`COUNT(*)::int`,
      grossTotalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      avgTicketBsCents: sql<number>`COALESCE(ROUND(AVG(${orders.grandTotalBsCents})), 0)::int`,
    })
    .from(orders)
    .where(
      and(
        SALE_STATUSES,
        sql`${LOCAL_DATE} >= ${fromDate}::date`,
        sql`${LOCAL_DATE} <= ${toDate}::date`,
      ),
    )
    .groupBy(hourExpr)
    .orderBy(hourExpr);
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #2 — Riesgo de agotamiento / "86" por plato (valor operativo 5)
// NO existe en legacy ni en gm-app; se infiere de la hora de última venta por
// plato y día. Alimenta umbrales de alerta del QuickAvailabilityPanel.
// ───────────────────────────────────────────────────────────────────────────

export interface DishSelloutRiskRow {
  itemId: string;
  name: string;
  daysSold: number;
  avgLastHour: number; // promedio de la hora de última venta (Caracas)
  daysLastBefore13: number; // días cuya última venta fue antes de las 13h
  pctDaysBefore13: number; // % de días con última venta < 13h (proxy de 86 temprano)
  daysUntilClose: number; // días cuya última venta fue >= 15h
  avgUnitsPerDay: number;
}

export async function getDishSelloutRisk(
  fromDate: string,
  toDate: string,
  topN = 15,
): Promise<DishSelloutRiskRow[]> {
  const query = sql`
    WITH sale_lines AS (
      SELECT
        it."id"        AS item_id,
        it.name        AS name,
        it.quantity    AS quantity,
        (o.created_at AT TIME ZONE 'America/Caracas')::date          AS d,
        EXTRACT(HOUR FROM (o.created_at AT TIME ZONE 'America/Caracas'))::int AS hr
      FROM orders o
      CROSS JOIN LATERAL jsonb_to_recordset(o.items_snapshot)
        AS it(id text, name text, quantity numeric, "itemTotalBsCents" bigint)
      WHERE o.status IN ('paid','kitchen','delivered')
        AND (o.created_at AT TIME ZONE 'America/Caracas')::date BETWEEN ${fromDate}::date AND ${toDate}::date
    ),
    top_items AS (
      SELECT item_id
      FROM sale_lines
      GROUP BY item_id
      ORDER BY SUM(quantity) DESC
      LIMIT ${topN}
    ),
    per_day AS (
      SELECT sl.item_id, MAX(sl.name) AS name, sl.d,
             MAX(sl.hr) AS last_hour, SUM(sl.quantity) AS units_day
      FROM sale_lines sl
      JOIN top_items ti ON ti.item_id = sl.item_id
      GROUP BY sl.item_id, sl.d
    )
    SELECT
      item_id,
      MAX(name)                                                   AS name,
      COUNT(*)::int                                               AS days_sold,
      ROUND(AVG(last_hour), 1)                                    AS avg_last_hour,
      SUM((last_hour < 13)::int)::int                             AS days_last_before_13,
      ROUND(SUM((last_hour < 13)::int) * 100.0 / COUNT(*), 1)     AS pct_days_before_13,
      SUM((last_hour >= 15)::int)::int                            AS days_until_close,
      ROUND(AVG(units_day), 1)                                    AS avg_units_per_day
    FROM per_day
    GROUP BY item_id
    ORDER BY pct_days_before_13 DESC
  `;

  return asRows(await db.execute(query)).map((r) => ({
    itemId: String(r.item_id),
    name: String(r.name),
    daysSold: Number(r.days_sold),
    avgLastHour: Number(r.avg_last_hour),
    daysLastBefore13: Number(r.days_last_before_13),
    pctDaysBefore13: Number(r.pct_days_before_13),
    daysUntilClose: Number(r.days_until_close),
    avgUnitsPerDay: Number(r.avg_units_per_day),
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #3 — Histórico de ventas diarias (valor operativo 5)
// Legacy 1a. gm-app solo tiene el día actual; esto da la serie para tendencias.
// ───────────────────────────────────────────────────────────────────────────

export interface DailySalesRow {
  date: string; // 'YYYY-MM-DD' (Caracas)
  dayName: string; // 'Monday' … 'Sunday'
  orderCount: number;
  cancelledCount: number;
  grossTotalBsCents: number; // integer
  avgTicketBsCents: number; // integer
  minTicketBsCents: number; // integer
  maxTicketBsCents: number; // integer
}

export async function getDailySalesHistory(
  fromDate: string,
  toDate: string,
): Promise<DailySalesRow[]> {
  return db
    .select({
      date: sql<string>`to_char(${LOCAL_DATE}, 'YYYY-MM-DD')`,
      dayName: sql<string>`trim(to_char(${LOCAL_DATE}, 'Day'))`,
      orderCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} IN ('paid','kitchen','delivered'))::int`,
      cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'cancelled')::int`,
      grossTotalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}) FILTER (WHERE ${orders.status} IN ('paid','kitchen','delivered')), 0)::int`,
      avgTicketBsCents: sql<number>`COALESCE(ROUND(AVG(${orders.grandTotalBsCents}) FILTER (WHERE ${orders.status} IN ('paid','kitchen','delivered'))), 0)::int`,
      minTicketBsCents: sql<number>`COALESCE(MIN(${orders.grandTotalBsCents}) FILTER (WHERE ${orders.status} IN ('paid','kitchen','delivered')), 0)::int`,
      maxTicketBsCents: sql<number>`COALESCE(MAX(${orders.grandTotalBsCents}) FILTER (WHERE ${orders.status} IN ('paid','kitchen','delivered')), 0)::int`,
    })
    .from(orders)
    .where(
      and(
        sql`${LOCAL_DATE} >= ${fromDate}::date`,
        sql`${LOCAL_DATE} <= ${toDate}::date`,
      ),
    )
    .groupBy(LOCAL_DATE)
    .orderBy(desc(LOCAL_DATE));
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #4 — Ranking de productos por rango (valor operativo 4)
// Legacy 1b. Complementa getMenuItemProfitability() (que mira margen) con
// volumen real + participación en venta sobre un rango arbitrario.
// ───────────────────────────────────────────────────────────────────────────

export interface ProductRankingRow {
  itemId: string;
  name: string;
  inOrderCount: number; // # de órdenes distintas que lo incluyen
  units: number; // unidades vendidas
  revenueBsCents: number; // integer (céntimos Bs)
  pctOfRevenue: number; // % sobre la venta total de ítems en el rango
}

export async function getProductRanking(
  fromDate: string,
  toDate: string,
  limit = 25,
): Promise<ProductRankingRow[]> {
  const query = sql`
    WITH lines AS (
      SELECT
        o.id        AS order_id,
        it."id"     AS item_id,
        it.name     AS name,
        it.quantity AS quantity,
        it."itemTotalBsCents" AS line_total
      FROM orders o
      CROSS JOIN LATERAL jsonb_to_recordset(o.items_snapshot)
        AS it(id text, name text, quantity numeric, "itemTotalBsCents" bigint)
      WHERE o.status IN ('paid','kitchen','delivered')
        AND (o.created_at AT TIME ZONE 'America/Caracas')::date BETWEEN ${fromDate}::date AND ${toDate}::date
    )
    SELECT
      item_id,
      MAX(name)                                AS name,
      COUNT(DISTINCT order_id)::int            AS in_order_count,
      COALESCE(SUM(quantity), 0)::int          AS units,
      COALESCE(SUM(line_total), 0)::bigint     AS revenue_bs_cents,
      ROUND(SUM(line_total) * 100.0 / NULLIF((SELECT SUM(line_total) FROM lines), 0), 2) AS pct_of_revenue
    FROM lines
    GROUP BY item_id
    ORDER BY revenue_bs_cents DESC
    LIMIT ${limit}
  `;

  return asRows(await db.execute(query)).map((r) => ({
    itemId: String(r.item_id),
    name: String(r.name),
    inOrderCount: Number(r.in_order_count),
    units: Number(r.units),
    revenueBsCents: Number(r.revenue_bs_cents),
    pctOfRevenue: Number(r.pct_of_revenue),
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #5 — Ventas semanales (valor operativo 4)
// Legacy 1g. Semana ISO (lunes) en hora Caracas, para estacionalidad.
// ───────────────────────────────────────────────────────────────────────────

export interface WeeklySalesRow {
  weekStart: string; // lunes 'YYYY-MM-DD' (Caracas)
  isoYear: number;
  isoWeek: number;
  orderCount: number;
  grossTotalBsCents: number; // integer
  avgTicketBsCents: number; // integer
}

export async function getWeeklySales(
  fromDate: string,
  toDate: string,
): Promise<WeeklySalesRow[]> {
  const weekStart = sql`date_trunc('week', ${LOCAL_TS})::date`;

  return db
    .select({
      weekStart: sql<string>`to_char(${weekStart}, 'YYYY-MM-DD')`,
      isoYear: sql<number>`EXTRACT(ISOYEAR FROM ${weekStart})::int`,
      isoWeek: sql<number>`EXTRACT(WEEK FROM ${weekStart})::int`,
      orderCount: sql<number>`COUNT(*)::int`,
      grossTotalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      avgTicketBsCents: sql<number>`COALESCE(ROUND(AVG(${orders.grandTotalBsCents})), 0)::int`,
    })
    .from(orders)
    .where(
      and(
        SALE_STATUSES,
        sql`${LOCAL_DATE} >= ${fromDate}::date`,
        sql`${LOCAL_DATE} <= ${toDate}::date`,
      ),
    )
    .groupBy(weekStart)
    .orderBy(desc(weekStart));
}
