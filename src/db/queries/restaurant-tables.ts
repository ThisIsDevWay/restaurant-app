import { db } from "@/db";
import {
  restaurantTables,
  type RestaurantTable,
  type NewRestaurantTable,
} from "@/db/schema/restaurant-tables";
import { eq, asc, sql, inArray } from "drizzle-orm";
import { customAlphabet } from "nanoid";

// Alphabet without visually ambiguous chars (0, O, I, 1, l)
const nanoid = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

// ── Read ────────────────────────────────────────────────────────────────────

export async function getAllTables(): Promise<RestaurantTable[]> {
  return db.query.restaurantTables.findMany({
    orderBy: [
      asc(restaurantTables.sortOrder),
      asc(restaurantTables.section),
      asc(restaurantTables.gridRow),
      asc(restaurantTables.gridCol),
    ],
  });
}

export async function getActiveTables(): Promise<RestaurantTable[]> {
  return db.query.restaurantTables.findMany({
    where: eq(restaurantTables.isActive, true),
    orderBy: [
      asc(restaurantTables.sortOrder),
      asc(restaurantTables.section),
      asc(restaurantTables.gridRow),
      asc(restaurantTables.gridCol),
    ],
  });
}

export async function getTableByToken(
  token: string
): Promise<RestaurantTable | undefined> {
  return db.query.restaurantTables.findFirst({
    where: eq(restaurantTables.qrToken, token),
  });
}

export async function getTableById(
  id: string
): Promise<RestaurantTable | undefined> {
  return db.query.restaurantTables.findFirst({
    where: eq(restaurantTables.id, id),
  });
}

export interface TableStats {
  total: number;
  active: number;
  totalCapacity: number;
  sections: string[];
}

export async function getTableStats(): Promise<TableStats> {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${restaurantTables.isActive} = true)::int`,
      totalCapacity: sql<number>`coalesce(sum(${restaurantTables.capacity}), 0)::int`,
    })
    .from(restaurantTables);

  const sections = await db
    .selectDistinct({ section: restaurantTables.section })
    .from(restaurantTables)
    .where(eq(restaurantTables.isActive, true));

  return {
    total: rows[0]?.total ?? 0,
    active: rows[0]?.active ?? 0,
    totalCapacity: rows[0]?.totalCapacity ?? 0,
    sections: sections.map((s) => s.section ?? "Principal").filter(Boolean),
  };
}

// ── Write ────────────────────────────────────────────────────────────────────

export type CreateTableInput = Omit<
  NewRestaurantTable,
  "id" | "qrToken" | "createdAt" | "updatedAt"
>;

export async function createTable(
  data: CreateTableInput
): Promise<RestaurantTable> {
  // Get max sortOrder to append at the end
  const maxOrderResult = await db
    .select({ max: sql<number>`max(${restaurantTables.sortOrder})` })
    .from(restaurantTables);
  const nextOrder = (maxOrderResult[0]?.max ?? -1) + 1;

  const [table] = await db
    .insert(restaurantTables)
    .values({ ...data, sortOrder: nextOrder, qrToken: nanoid() })
    .returning();
  if (!table) throw new Error("Insert returned no rows");
  return table;
}

export type UpdateTableInput = Partial<
  Omit<NewRestaurantTable, "id" | "qrToken" | "createdAt" | "updatedAt">
>;

export async function updateTable(
  id: string,
  data: UpdateTableInput
): Promise<RestaurantTable> {
  const [table] = await db
    .update(restaurantTables)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(restaurantTables.id, id))
    .returning();
  if (!table) throw new Error(`Table ${id} not found`);
  return table;
}

export async function deleteTable(id: string): Promise<void> {
  await db.delete(restaurantTables).where(eq(restaurantTables.id, id));
}

export async function regenerateToken(
  id: string
): Promise<{ qrToken: string }> {
  const newToken = nanoid();
  const [updated] = await db
    .update(restaurantTables)
    .set({ qrToken: newToken, updatedAt: new Date() })
    .where(eq(restaurantTables.id, id))
    .returning({ qrToken: restaurantTables.qrToken });
  if (!updated) throw new Error(`Table ${id} not found`);
  return { qrToken: updated.qrToken };
}

// ── Layout batch upsert ──────────────────────────────────────────────────────
// Uses a single transaction with parallel promises — much faster than N serial awaits.

export interface LayoutUpdate {
  id: string;
  gridCol: number;
  gridRow: number;
  colSpan: number;
  rowSpan: number;
  rotation?: number;
}

export async function upsertTableLayout(
  updates: LayoutUpdate[]
): Promise<void> {
  if (updates.length === 0) return;

  await db.transaction(async (tx) => {
    await Promise.all(
      updates.map((u) =>
        tx
          .update(restaurantTables)
          .set({
            gridCol: u.gridCol,
            gridRow: u.gridRow,
            colSpan: u.colSpan,
            rowSpan: u.rowSpan,
            ...(u.rotation !== undefined ? { rotation: u.rotation } : {}),
            updatedAt: new Date(),
          })
          .where(eq(restaurantTables.id, u.id))
      )
    );
  });
}

// Check if a label already exists (case-insensitive), excluding a given id
export async function labelExists(
  label: string,
  excludeId?: string
): Promise<boolean> {
  const rows = await db
    .select({ id: restaurantTables.id })
    .from(restaurantTables)
    .where(
      sql`lower(trim(${restaurantTables.label})) = lower(trim(${label}))`
    )
    .limit(1);
  if (rows.length === 0) return false;
  if (excludeId && rows[0]?.id === excludeId) return false;
  return true;
}

export async function updateTablesSortOrder(
  orderedIds: string[]
): Promise<void> {
  if (orderedIds.length === 0) return;

  await db.transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(restaurantTables)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(restaurantTables.id, id))
      )
    );
  });
}