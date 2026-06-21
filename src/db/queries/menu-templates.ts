import { db } from "../index";
import { menuTemplates } from "../schema/menu-templates";
import { asc, eq } from "drizzle-orm";

export async function getMenuTemplates() {
  return db
    .select()
    .from(menuTemplates)
    .orderBy(asc(menuTemplates.name));
}

export async function getMenuTemplateById(id: string) {
  const result = await db
    .select()
    .from(menuTemplates)
    .where(eq(menuTemplates.id, id))
    .limit(1);
  return result[0] || null;
}
