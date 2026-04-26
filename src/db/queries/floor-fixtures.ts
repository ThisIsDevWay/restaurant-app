import { db } from "@/db";
import { floorFixtures, type FloorFixture, type NewFloorFixture } from "@/db/schema/floor-fixtures";
import { eq } from "drizzle-orm";

export async function getAllFixtures(): Promise<FloorFixture[]> {
  return db.query.floorFixtures.findMany();
}

export async function createFixture(data: Omit<NewFloorFixture, "id" | "createdAt" | "updatedAt">): Promise<FloorFixture> {
  const [fixture] = await db.insert(floorFixtures).values(data).returning();
  if (!fixture) throw new Error("Insert returned no rows");
  return fixture;
}

export async function updateFixture(id: string, data: Partial<NewFloorFixture>): Promise<FloorFixture> {
  const [fixture] = await db
    .update(floorFixtures)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(floorFixtures.id, id))
    .returning();
  if (!fixture) throw new Error(`Fixture ${id} not found`);
  return fixture;
}

export async function deleteFixture(id: string): Promise<void> {
  await db.delete(floorFixtures).where(eq(floorFixtures.id, id));
}

export async function upsertFixtureLayout(
  updates: Array<{ id: string; gridCol: number; gridRow: number; colSpan: number; rowSpan: number; rotation: number }>
): Promise<void> {
  if (updates.length === 0) return;
  await db.transaction(async (tx) => {
    await Promise.all(
      updates.map((u) =>
        tx.update(floorFixtures)
          .set({ gridCol: u.gridCol, gridRow: u.gridRow, colSpan: u.colSpan, rowSpan: u.rowSpan, rotation: u.rotation, updatedAt: new Date() })
          .where(eq(floorFixtures.id, u.id))
      )
    );
  });
}
