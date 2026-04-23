"use server";

import { db } from "@/db";
import { dailyMenuItems, dailyAdicionales, dailyBebidas, dailyContornos } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";
import { todayCaracas } from "@/lib/utils/date";

const ToggleSchema = v.object({
  itemId: v.string(),
  isAvailable: v.boolean(),
  type: v.picklist(["plato", "adicional", "bebida", "contorno"]),
});

export const toggleDailyItemAvailabilityAction = adminActionClient
  .schema(ToggleSchema)
  .action(async ({ parsedInput: { itemId, isAvailable, type } }) => {
    const today = todayCaracas(); // "YYYY-MM-DD"
    const soldOutAt = isAvailable ? null : new Date();

    try {
      switch (type) {
        case "plato":
          await db
            .update(dailyMenuItems)
            .set({ isAvailable, soldOutAt })
            .where(and(eq(dailyMenuItems.menuItemId, itemId), eq(dailyMenuItems.date, today)));
          break;
        case "adicional":
          await db
            .update(dailyAdicionales)
            .set({ isAvailable, soldOutAt })
            .where(and(eq(dailyAdicionales.adicionalItemId, itemId), eq(dailyAdicionales.date, today)));
          break;
        case "bebida":
          await db
            .update(dailyBebidas)
            .set({ isAvailable, soldOutAt })
            .where(and(eq(dailyBebidas.bebidaItemId, itemId), eq(dailyBebidas.date, today)));
          break;
        case "contorno":
          await db
            .update(dailyContornos)
            .set({ isAvailable, soldOutAt })
            .where(and(eq(dailyContornos.contornoItemId, itemId), eq(dailyContornos.date, today)));
          break;
      }

      revalidatePath("/");
      revalidatePath("/admin/menu-del-dia");
      revalidatePath("/admin/orders");
      
      return { success: true };
    } catch (error) {
      return { success: false, error: "Error al actualizar disponibilidad." };
    }
  });
