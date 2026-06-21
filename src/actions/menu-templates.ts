"use server";

import { db } from "@/db";
import { menuTemplates } from "@/db/schema/menu-templates";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

const templateDataSchema = v.object({
  menuItemIds: v.array(v.string()),
  adicionalIds: v.array(v.string()),
  bebidaIds: v.array(v.string()),
  contornoIds: v.array(v.string()),
});

export const saveMenuTemplateAction = adminActionClient
  .schema(
    v.object({
      id: v.optional(v.nullable(v.string())),
      name: v.pipe(v.string(), v.minLength(1, "El nombre es requerido")),
      description: v.optional(v.nullable(v.string())),
      data: templateDataSchema,
    })
  )
  .action(async ({ parsedInput: { id, name, description, data } }) => {
    try {
      if (id) {
        await db
          .update(menuTemplates)
          .set({
            name,
            description: description || null,
            data,
            updatedAt: new Date(),
          })
          .where(eq(menuTemplates.id, id));
      } else {
        await db.insert(menuTemplates).values({
          name,
          description: description || null,
          data,
        });
      }
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      return { success: false, error: "Error al guardar la plantilla" };
    }
  });

export const deleteMenuTemplateAction = adminActionClient
  .schema(v.object({ id: v.string() }))
  .action(async ({ parsedInput: { id } }) => {
    try {
      await db.delete(menuTemplates).where(eq(menuTemplates.id, id));
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      return { success: false, error: "Error al eliminar la plantilla" };
    }
  });
