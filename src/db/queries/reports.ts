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
import { orders, bankNotifications } from "../schema";
import { sql, and, desc, eq } from "drizzle-orm";
import { RECONCILIATION_MATCH_SUFFIX_LEN } from "@/lib/reconciliation-rules";

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
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<HourlySalesRow[]> {
  const hourExpr = sql<number>`EXTRACT(HOUR FROM ${LOCAL_TS})::int`;
  const conditions = [
    SALE_STATUSES,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  return db
    .select({
      hour: hourExpr,
      orderCount: sql<number>`COUNT(*)::int`,
      grossTotalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      avgTicketBsCents: sql<number>`COALESCE(ROUND(AVG(${orders.grandTotalBsCents})), 0)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(hourExpr)
    .orderBy(hourExpr);
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #2 — Riesgo de agotamiento / "86" por plato (valor operativo 5)
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
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<DailySalesRow[]> {
  const conditions = [
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

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
    .where(and(...conditions))
    .groupBy(LOCAL_DATE)
    .orderBy(desc(LOCAL_DATE));
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #4 — Ranking de productos por rango (valor operativo 4)
// Modificado para desglosar también adicionales, bebidas y contornos,
// utilizando un CTE con filtros de fecha y estatus para optimizar el parsing de JSONB.
// Admite también filtrado granular por rol creador / caja.
// ───────────────────────────────────────────────────────────────────────────

export interface ProductRankingRow {
  itemId: string;
  name: string;
  type: "dish" | "adicional" | "bebida" | "contorno";
  inOrderCount: number; // # de órdenes distintas que lo incluyen
  units: number; // unidades vendidas
  revenueBsCents: number; // integer (céntimos Bs)
  pctOfRevenue: number; // % sobre la venta total de ítems en el rango
}

export async function getProductRanking(
  fromDate: string,
  toDate: string,
  limit = 25,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<ProductRankingRow[]> {
  const roleFilter = createdByRole 
    ? sql`AND created_by_role = ${createdByRole}` 
    : sql``;

  const query = sql`
    WITH filtered_orders AS (
      SELECT id, items_snapshot, created_at
      FROM orders
      WHERE status IN ('paid','kitchen','delivered')
        AND (created_at AT TIME ZONE 'America/Caracas')::date BETWEEN ${fromDate}::date AND ${toDate}::date
        ${roleFilter}
    ),
    all_lines AS (
      -- Platos principales
      SELECT
        o.id AS order_id,
        it.id AS item_id,
        it.name AS name,
        'dish' AS item_type,
        it.quantity::int AS quantity,
        it."itemTotalBsCents"::bigint AS line_total
      FROM filtered_orders o
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(o.items_snapshot, '[]'::jsonb))
        AS it(id text, name text, quantity numeric, "itemTotalBsCents" bigint)

      UNION ALL

      -- Adicionales (extras puros)
      SELECT
        o.id AS order_id,
        ad.id AS item_id,
        ad.name AS name,
        'adicional' AS item_type,
        (COALESCE(ad.quantity, 1) * it.quantity)::int AS quantity,
        (ad."priceBsCents" * COALESCE(ad.quantity, 1) * it.quantity)::bigint AS line_total
      FROM filtered_orders o
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(o.items_snapshot, '[]'::jsonb))
        AS it(id text, name text, quantity numeric, "selectedAdicionales" jsonb)
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(it."selectedAdicionales", '[]'::jsonb))
        AS ad(id text, name text, "priceBsCents" bigint, quantity int, "substitutesComponentId" text)
      WHERE ad."substitutesComponentId" IS NULL

      UNION ALL

      -- Bebidas
      SELECT
        o.id AS order_id,
        beb.id AS item_id,
        beb.name AS name,
        'bebida' AS item_type,
        (COALESCE(beb.quantity, 1) * it.quantity)::int AS quantity,
        (beb."priceBsCents" * COALESCE(beb.quantity, 1) * it.quantity)::bigint AS line_total
      FROM filtered_orders o
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(o.items_snapshot, '[]'::jsonb))
        AS it(id text, name text, quantity numeric, "selectedBebidas" jsonb)
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(it."selectedBebidas", '[]'::jsonb))
        AS beb(id text, name text, "priceBsCents" bigint, quantity int)

      UNION ALL

      -- Contornos fijos
      SELECT
        o.id AS order_id,
        fc.id AS item_id,
        fc.name AS name,
        'contorno' AS item_type,
        it.quantity::int AS quantity,
        (COALESCE(fc."priceBsCents", 0) * it.quantity)::bigint AS line_total
      FROM filtered_orders o
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(o.items_snapshot, '[]'::jsonb))
        AS it(id text, name text, quantity numeric, "fixedContornos" jsonb)
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(it."fixedContornos", '[]'::jsonb))
        AS fc(id text, name text, "priceBsCents" bigint)

      UNION ALL

      -- Contornos sustitutos
      SELECT
        o.id AS order_id,
        ad.id AS item_id,
        ad.name || ' (Sustituto)' AS name,
        'contorno' AS item_type,
        (COALESCE(ad.quantity, 1) * it.quantity)::int AS quantity,
        (ad."priceBsCents" * COALESCE(ad.quantity, 1) * it.quantity)::bigint AS line_total
      FROM filtered_orders o
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(o.items_snapshot, '[]'::jsonb))
        AS it(id text, name text, quantity numeric, "selectedAdicionales" jsonb)
      CROSS JOIN LATERAL jsonb_to_recordset(coalesce(it."selectedAdicionales", '[]'::jsonb))
        AS ad(id text, name text, "priceBsCents" bigint, quantity int, "substitutesComponentId" text)
      WHERE ad."substitutesComponentId" IS NOT NULL
    )
    SELECT
      item_id,
      MAX(name)                                AS name,
      item_type                                AS type,
      COUNT(DISTINCT order_id)::int            AS in_order_count,
      COALESCE(SUM(quantity), 0)::int          AS units,
      COALESCE(SUM(line_total), 0)::bigint     AS revenue_bs_cents,
      ROUND(COALESCE(SUM(line_total), 0) * 100.0 / NULLIF((SELECT SUM(line_total) FROM all_lines), 0), 2) AS pct_of_revenue
    FROM all_lines
    GROUP BY item_id, item_type
    ORDER BY revenue_bs_cents DESC, units DESC
    LIMIT ${limit}
  `;

  return asRows(await db.execute(query)).map((r) => ({
    itemId: String(r.item_id),
    name: String(r.name),
    type: String(r.type) as "dish" | "adicional" | "bebida" | "contorno",
    inOrderCount: Number(r.in_order_count),
    units: Number(r.units),
    revenueBsCents: Number(r.revenue_bs_cents),
    pctOfRevenue: Number(r.pct_of_revenue),
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// GAP #5 — Ventas semanales (valor operativo 4)
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
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<WeeklySalesRow[]> {
  const weekStart = sql`date_trunc('week', ${LOCAL_TS})::date`;
  const conditions = [
    SALE_STATUSES,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

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
    .where(and(...conditions))
    .groupBy(weekStart)
    .orderBy(desc(weekStart));
}

// ───────────────────────────────────────────────────────────────────────────
// NUEVOS REPORTES — Implementación del Plan de Reportes Corregido
// ───────────────────────────────────────────────────────────────────────────

export interface PaymentMethodSummaryRow {
  paymentMethod: string;
  paymentProvider: string;
  orderCount: number;
  totalBsCents: number;
  totalUsdCents: number;
}

/** Consolidado de ventas por método y proveedor de pago (Arqueo analítico Opción A) */
export async function getPaymentMethodsSummary(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<PaymentMethodSummaryRow[]> {
  const conditions = [
    SALE_STATUSES,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  return db
    .select({
      paymentMethod: orders.paymentMethod,
      paymentProvider: orders.paymentProvider,
      orderCount: sql<number>`COUNT(*)::int`,
      totalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      totalUsdCents: sql<number>`COALESCE(SUM(${orders.grandTotalUsdCents}), 0)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(orders.paymentMethod, orders.paymentProvider)
    .orderBy(desc(sql`SUM(${orders.grandTotalBsCents})`));
}

// ───────────────────────────────────────────────────────────────────────────
// CONCILIACIÓN BANCARIA — con contexto completo del pedido
// ───────────────────────────────────────────────────────────────────────────

export interface ReconciliationReportRow {
  type: "reconciled" | "manual_no_sms" | "orphan_sms" | "ambiguous_collision" | "amount_mismatch";
  orderId: string | null;
  orderNumber: number | null;
  orderTotalBsCents: number | null;
  orderReference: string | null;
  customerPhone: string | null;
  customerName: string | null;
  orderMode: string | null;
  channel: string | null;  // "Web / Cliente" | "Caja POS" | "Mesero" | "Admin"
  paymentMethod: string | null;
  tableNumber: string | null;
  notificationId: string | null;
  notificationReference: string | null;
  notificationAmountBsCents: number | null;
  notificationSource: string | null;
  createdAt: Date;
}

/** Reporte de conciliación cruzado contra bank_notifications, con contexto completo del pedido */
export async function getReconciliationReport(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<ReconciliationReportRow[]> {
  const suffixLen = RECONCILIATION_MATCH_SUFFIX_LEN;
  const roleFilter = createdByRole 
    ? sql`AND created_by_role = ${createdByRole}` 
    : sql``;

  const query = sql`
    WITH range_orders AS (
      SELECT
        id,
        order_number,
        status,
        payment_method,
        payment_provider,
        payment_reference,
        grand_total_bs_cents,
        customer_phone,
        customer_name,
        order_mode,
        created_by_role,
        table_number,
        created_at
      FROM orders
      WHERE status IN ('paid', 'kitchen', 'delivered', 'pending')
        AND (created_at AT TIME ZONE 'America/Caracas')::date BETWEEN ${fromDate}::date AND ${toDate}::date
        ${roleFilter}
    ),
    range_notifications AS (
      SELECT
        id,
        source,
        sender,
        amount_bs_cents,
        reference,
        status,
        order_id,
        created_at
      FROM bank_notifications
      WHERE (created_at AT TIME ZONE 'America/Caracas')::date BETWEEN ${fromDate}::date AND ${toDate}::date
    ),
    suffix_matches AS (
      SELECT
        ro.id AS order_id,
        rn.id AS notification_id,
        (ro.grand_total_bs_cents = rn.amount_bs_cents) AS amount_match,
        COUNT(*) OVER(PARTITION BY ro.id) AS notifications_count_for_order,
        COUNT(*) OVER(PARTITION BY rn.id) AS orders_count_for_notification
      FROM range_orders ro
      JOIN range_notifications rn ON right(rn.reference, ${suffixLen}) = right(ro.payment_reference, ${suffixLen})
    )

    -- 1. Conciliados
    SELECT
      'reconciled'::text AS type,
      ro.id AS "orderId",
      ro.order_number AS "orderNumber",
      ro.grand_total_bs_cents AS "orderTotalBsCents",
      ro.payment_reference AS "orderReference",
      ro.customer_phone AS "customerPhone",
      ro.customer_name AS "customerName",
      ro.order_mode AS "orderMode",
      ro.created_by_role AS "createdByRole",
      ro.payment_method AS "paymentMethod",
      ro.table_number AS "tableNumber",
      rn.id AS "notificationId",
      rn.reference AS "notificationReference",
      rn.amount_bs_cents AS "notificationAmountBsCents",
      rn.source AS "notificationSource",
      ro.created_at AS "createdAt"
    FROM range_orders ro
    JOIN range_notifications rn ON rn.order_id = ro.id OR rn.reference = ro.payment_reference

    UNION ALL

    -- 2. Confirmación manual sin SMS
    SELECT
      'manual_no_sms'::text AS type,
      ro.id AS "orderId",
      ro.order_number AS "orderNumber",
      ro.grand_total_bs_cents AS "orderTotalBsCents",
      ro.payment_reference AS "orderReference",
      ro.customer_phone AS "customerPhone",
      ro.customer_name AS "customerName",
      ro.order_mode AS "orderMode",
      ro.created_by_role AS "createdByRole",
      ro.payment_method AS "paymentMethod",
      ro.table_number AS "tableNumber",
      NULL::uuid AS "notificationId",
      NULL::text AS "notificationReference",
      NULL::int AS "notificationAmountBsCents",
      NULL::text AS "notificationSource",
      ro.created_at AS "createdAt"
    FROM range_orders ro
    WHERE ro.status IN ('paid', 'kitchen', 'delivered')
      AND ro.payment_provider IN ('pabilo_notifications', 'local_notifications')
      AND NOT EXISTS (
        SELECT 1 FROM range_notifications rn
        WHERE rn.order_id = ro.id
           OR rn.reference = ro.payment_reference
           OR right(rn.reference, ${suffixLen}) = right(ro.payment_reference, ${suffixLen})
      )

    UNION ALL

    -- 3. Notificaciones huérfanas
    SELECT
      'orphan_sms'::text AS type,
      NULL::uuid AS "orderId",
      NULL::int AS "orderNumber",
      NULL::int AS "orderTotalBsCents",
      NULL::text AS "orderReference",
      NULL::text AS "customerPhone",
      NULL::text AS "customerName",
      NULL::text AS "orderMode",
      NULL::text AS "createdByRole",
      NULL::text AS "paymentMethod",
      NULL::text AS "tableNumber",
      rn.id AS "notificationId",
      rn.reference AS "notificationReference",
      rn.amount_bs_cents AS "notificationAmountBsCents",
      rn.source AS "notificationSource",
      rn.created_at AS "createdAt"
    FROM range_notifications rn
    WHERE rn.status = 'pending'
      AND NOT EXISTS (
        SELECT 1 FROM range_orders ro
        WHERE right(rn.reference, ${suffixLen}) = right(ro.payment_reference, ${suffixLen})
      )

    UNION ALL

    -- 4. Conflictos
    SELECT
      CASE
        WHEN sm.amount_match = false THEN 'amount_mismatch'::text
        ELSE 'ambiguous_collision'::text
      END AS type,
      ro.id AS "orderId",
      ro.order_number AS "orderNumber",
      ro.grand_total_bs_cents AS "orderTotalBsCents",
      ro.payment_reference AS "orderReference",
      ro.customer_phone AS "customerPhone",
      ro.customer_name AS "customerName",
      ro.order_mode AS "orderMode",
      ro.created_by_role AS "createdByRole",
      ro.payment_method AS "paymentMethod",
      ro.table_number AS "tableNumber",
      rn.id AS "notificationId",
      rn.reference AS "notificationReference",
      rn.amount_bs_cents AS "notificationAmountBsCents",
      rn.source AS "notificationSource",
      ro.created_at AS "createdAt"
    FROM suffix_matches sm
    JOIN range_orders ro ON ro.id = sm.order_id
    JOIN range_notifications rn ON rn.id = sm.notification_id
    WHERE ro.status = 'pending'
      AND (sm.amount_match = false OR sm.notifications_count_for_order > 1 OR sm.orders_count_for_notification > 1)
  `;

  return asRows(await db.execute(query)).map((r) => ({
    type: String(r.type) as ReconciliationReportRow["type"],
    orderId: r.orderId ? String(r.orderId) : null,
    orderNumber: r.orderNumber ? Number(r.orderNumber) : null,
    orderTotalBsCents: r.orderTotalBsCents ? Number(r.orderTotalBsCents) : null,
    orderReference: r.orderReference ? String(r.orderReference) : null,
    customerPhone: r.customerPhone ? String(r.customerPhone) : null,
    customerName: r.customerName ? String(r.customerName) : null,
    orderMode: r.orderMode ? String(r.orderMode) : null,
    channel: channelLabel(r.createdByRole as string | null),
    paymentMethod: r.paymentMethod ? String(r.paymentMethod) : null,
    tableNumber: r.tableNumber ? String(r.tableNumber) : null,
    notificationId: r.notificationId ? String(r.notificationId) : null,
    notificationReference: r.notificationReference ? String(r.notificationReference) : null,
    notificationAmountBsCents: r.notificationAmountBsCents ? Number(r.notificationAmountBsCents) : null,
    notificationSource: r.notificationSource ? String(r.notificationSource) : null,
    createdAt: new Date(String(r.createdAt)),
  }));
}

export interface IgtfSummaryRow {
  date: string;
  orderCount: number;
  totalIgtfBsCents: number;
  totalIgtfUsdCents: number;
  totalSalesBsCents: number;
  totalSalesUsdCents: number;
}

/** Consolidado diario de percepción de IGTF (3% sobre divisas en efectivo) */
export async function getIgtfSummary(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<IgtfSummaryRow[]> {
  const conditions = [
    SALE_STATUSES,
    sql`${orders.igtfBsCents} > 0`,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  return db
    .select({
      date: sql<string>`to_char(${LOCAL_DATE}, 'YYYY-MM-DD')`,
      orderCount: sql<number>`COUNT(*)::int`,
      totalIgtfBsCents: sql<number>`COALESCE(SUM(${orders.igtfBsCents}), 0)::int`,
      totalIgtfUsdCents: sql<number>`COALESCE(SUM(${orders.igtfUsdCents}), 0)::int`,
      totalSalesBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      totalSalesUsdCents: sql<number>`COALESCE(SUM(${orders.grandTotalUsdCents}), 0)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(LOCAL_DATE)
    .orderBy(desc(LOCAL_DATE));
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers de presentación
// ───────────────────────────────────────────────────────────────────────────

/** Convierte `created_by_role` en etiqueta legible para canal de origen. */
export function channelLabel(role: string | null | undefined): string {
  if (!role) return "Pedido Web";
  switch (role) {
    case "cashier": return "Caja";
    case "waiter": return "Mesero";
    case "admin": return "Admin";
    default: return role;
  }
}

/** Etiqueta legible para `order_mode`. */
export function orderModeLabel(mode: string | null | undefined): string {
  if (!mode) return "—";
  switch (mode) {
    case "on_site": return "En sitio";
    case "take_away": return "Para llevar";
    case "delivery": return "Delivery";
    default: return mode;
  }
}

// ───────────────────────────────────────────────────────────────────────────
// REPORTE GRANULAR #1 — Detalle de pedidos individuales con composición
// Devuelve la orden completa + items_snapshot como JSON para expansión en UI.
// ───────────────────────────────────────────────────────────────────────────

export interface OrderLineDetailRow {
  orderId: string;
  orderNumber: number;
  customerPhone: string;
  customerName: string | null;
  channel: string;        // "Web / Cliente" | "Caja POS" | "Mesero" | "Admin"
  orderMode: string;      // "En sitio" | "Para llevar" | "Delivery" | "—"
  tableNumber: string | null;
  paymentMethod: string;
  paymentProvider: string;
  paymentReference: string | null;
  status: string;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  subtotalBsCents: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  igtfBsCents: number;
  createdAt: Date;
  /** Raw items_snapshot JSONB — parsed on the client for expand/collapse. */
  itemsSnapshot: Array<{
    id: string;
    name: string;
    quantity: number;
    priceUsdCents: number;
    priceBsCents: number;
    itemTotalBsCents: number;
    fixedContornos: Array<{ id: string; name: string; priceBsCents: number }>;
    selectedAdicionales: Array<{
      id: string; name: string; priceBsCents: number;
      quantity?: number; substitutesComponentId?: string; substitutesComponentName?: string;
    }>;
    selectedBebidas?: Array<{ id: string; name: string; priceBsCents: number; quantity?: number }>;
    removedComponents?: Array<{ name: string }>;
  }>;
}

/**
 * Lista de pedidos individuales con su items_snapshot completo.
 * Limitado a `limit` filas (por defecto 200), ordenado por fecha descendente.
 */
export async function getOrderLineDetail(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
  limit = 200,
): Promise<OrderLineDetailRow[]> {
  const conditions = [
    SALE_STATUSES,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  const rows = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      customerPhone: orders.customerPhone,
      customerName: orders.customerName,
      createdByRole: orders.createdByRole,
      orderMode: orders.orderMode,
      tableNumber: orders.tableNumber,
      paymentMethod: orders.paymentMethod,
      paymentProvider: orders.paymentProvider,
      paymentReference: orders.paymentReference,
      status: orders.status,
      grandTotalBsCents: orders.grandTotalBsCents,
      grandTotalUsdCents: orders.grandTotalUsdCents,
      subtotalBsCents: orders.subtotalBsCents,
      packagingUsdCents: orders.packagingUsdCents,
      deliveryUsdCents: orders.deliveryUsdCents,
      igtfBsCents: orders.igtfBsCents,
      createdAt: orders.createdAt,
      itemsSnapshot: orders.itemsSnapshot,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    customerPhone: r.customerPhone,
    customerName: r.customerName,
    channel: channelLabel(r.createdByRole),
    orderMode: orderModeLabel(r.orderMode),
    tableNumber: r.tableNumber,
    paymentMethod: r.paymentMethod,
    paymentProvider: r.paymentProvider,
    paymentReference: r.paymentReference,
    status: r.status ?? "pending",
    grandTotalBsCents: r.grandTotalBsCents,
    grandTotalUsdCents: r.grandTotalUsdCents,
    subtotalBsCents: r.subtotalBsCents,
    packagingUsdCents: r.packagingUsdCents,
    deliveryUsdCents: r.deliveryUsdCents,
    igtfBsCents: r.igtfBsCents,
    createdAt: r.createdAt,
    itemsSnapshot: (r.itemsSnapshot ?? []) as OrderLineDetailRow["itemsSnapshot"],
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// REPORTE GRANULAR #2 — Desglose de caja por Método × Canal × Modo
// ───────────────────────────────────────────────────────────────────────────

export interface CashBreakdownRow {
  paymentMethod: string;
  channel: string;       // "Web / Cliente" | "Caja POS" | "Mesero" | "Admin"
  orderMode: string;     // "En sitio" | "Para llevar" | "Delivery" | "—"
  orderCount: number;
  totalBsCents: number;
  totalUsdCents: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
}

export async function getCashBreakdown(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
): Promise<CashBreakdownRow[]> {
  const conditions = [
    SALE_STATUSES,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  const rows = await db
    .select({
      paymentMethod: orders.paymentMethod,
      createdByRole: orders.createdByRole,
      orderMode: orders.orderMode,
      orderCount: sql<number>`COUNT(*)::int`,
      totalBsCents: sql<number>`COALESCE(SUM(${orders.grandTotalBsCents}), 0)::int`,
      totalUsdCents: sql<number>`COALESCE(SUM(${orders.grandTotalUsdCents}), 0)::int`,
      packagingUsdCents: sql<number>`COALESCE(SUM(${orders.packagingUsdCents}), 0)::int`,
      deliveryUsdCents: sql<number>`COALESCE(SUM(${orders.deliveryUsdCents}), 0)::int`,
    })
    .from(orders)
    .where(and(...conditions))
    .groupBy(orders.paymentMethod, orders.createdByRole, orders.orderMode)
    .orderBy(desc(sql`SUM(${orders.grandTotalBsCents})`));

  return rows.map((r) => ({
    paymentMethod: r.paymentMethod,
    channel: channelLabel(r.createdByRole),
    orderMode: orderModeLabel(r.orderMode),
    orderCount: r.orderCount,
    totalBsCents: r.totalBsCents,
    totalUsdCents: r.totalUsdCents,
    packagingUsdCents: r.packagingUsdCents,
    deliveryUsdCents: r.deliveryUsdCents,
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// REPORTE GRANULAR #3 — Transacciones individuales con IGTF
// ───────────────────────────────────────────────────────────────────────────

export interface IgtfTransactionRow {
  orderId: string;
  orderNumber: number;
  customerPhone: string;
  customerName: string | null;
  channel: string;
  paymentMethod: string;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  igtfBsCents: number;
  igtfUsdCents: number;
  createdAt: Date;
}

/** Lista cada orden individual con IGTF > 0 para respaldo transacción por transacción */
export async function getIgtfTransactions(
  fromDate: string,
  toDate: string,
  createdByRole?: "admin" | "waiter" | "cashier" | null,
  limit = 200,
): Promise<IgtfTransactionRow[]> {
  const conditions = [
    SALE_STATUSES,
    sql`${orders.igtfBsCents} > 0`,
    sql`${LOCAL_DATE} >= ${fromDate}::date`,
    sql`${LOCAL_DATE} <= ${toDate}::date`,
  ];

  if (createdByRole) {
    conditions.push(eq(orders.createdByRole, createdByRole));
  }

  const rows = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      customerPhone: orders.customerPhone,
      customerName: orders.customerName,
      createdByRole: orders.createdByRole,
      paymentMethod: orders.paymentMethod,
      grandTotalBsCents: orders.grandTotalBsCents,
      grandTotalUsdCents: orders.grandTotalUsdCents,
      igtfBsCents: orders.igtfBsCents,
      igtfUsdCents: orders.igtfUsdCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    orderId: r.orderId,
    orderNumber: r.orderNumber,
    customerPhone: r.customerPhone,
    customerName: r.customerName,
    channel: channelLabel(r.createdByRole),
    paymentMethod: r.paymentMethod,
    grandTotalBsCents: r.grandTotalBsCents,
    grandTotalUsdCents: r.grandTotalUsdCents,
    igtfBsCents: r.igtfBsCents,
    igtfUsdCents: r.igtfUsdCents,
    createdAt: r.createdAt,
  }));
}
