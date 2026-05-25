"use server";


import { db } from "@/db";
import { dailyMenuItems, dailyAdicionales, dailyBebidas, dailyContornos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { invalidateDailyMenuCache } from "@/db/queries/daily-menu";
import { logger } from "@/lib/logger";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const syncDailyMenuAction = adminActionClient
  .schema(v.object({
    date: v.string(),
    menuItemIds: v.array(v.string()),
    platoDelDiaId: v.optional(v.nullable(v.string())),
  }))
  .action(async ({ parsedInput: { date, menuItemIds, platoDelDiaId } }) => {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(dailyMenuItems).where(eq(dailyMenuItems.date, date));

        if (menuItemIds.length > 0) {
          await tx.insert(dailyMenuItems).values(
            menuItemIds.map((id, index) => ({
              menuItemId: id,
              date,
              sortOrder: index,
              isPlatoDelDia: platoDelDiaId != null && id === platoDelDiaId,
            }))
          );
        }
      });

      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      logger.error("[syncDailyMenu] Error", { error: String(error) });
      return { success: false, error: "Error al guardar el menú del día." };
    }
  });



export const syncDailyAdicionalesAction = adminActionClient
  .schema(v.object({ date: v.string(), adicionalIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { date, adicionalIds } }) => {
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(dailyAdicionales)
          .where(eq(dailyAdicionales.date, date));

        if (adicionalIds.length > 0) {
          await tx.insert(dailyAdicionales).values(
            adicionalIds.map((id, index) => ({
              date,
              adicionalItemId: id,
              sortOrder: index,
            })),
          );
        }
      });

      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      logger.error("[syncDailyAdicionales] Error", { error: String(error) });
      return {
        success: false,
        error: "Error al guardar los adicionales del día.",
      };
    }
  });



export const syncDailyBebidasAction = adminActionClient
  .schema(v.object({ date: v.string(), bebidaIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { date, bebidaIds } }) => {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(dailyBebidas).where(eq(dailyBebidas.date, date));

        if (bebidaIds.length > 0) {
          await tx.insert(dailyBebidas).values(
            bebidaIds.map((id, index) => ({
              date,
              bebidaItemId: id,
              sortOrder: index,
            })),
          );
        }
      });

      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      logger.error("[syncDailyBebidas] Error", { error: String(error) });
      return {
        success: false,
        error: "Error al guardar las bebidas del día.",
      };
    }
  });



export const syncDailyContornosAction = adminActionClient
  .schema(v.object({ date: v.string(), contornoIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { date, contornoIds } }) => {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(dailyContornos).where(eq(dailyContornos.date, date));

        if (contornoIds.length > 0) {
          await tx.insert(dailyContornos).values(
            contornoIds.map((id, index) => ({
              date,
              contornoItemId: id,
              sortOrder: index,
            })),
          );
        }
      });

      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      return { success: true };
    } catch (error) {
      logger.error("[syncDailyContornos] Error", { error: String(error) });
      return {
        success: false,
        error: "Error al guardar los contornos del día.",
      };
    }
  });



export const copyDailyMenuFromAction = adminActionClient
  .schema(v.object({ fromDate: v.string(), toDate: v.string() }))
  .action(async ({ parsedInput: { fromDate, toDate } }) => {
    try {
      const count = await db.transaction(async (tx) => {
        // Leer todo el menú fuente en paralelo
        const [items, ads, bebs, conts] = await Promise.all([
          tx
            .select({
              menuItemId: dailyMenuItems.menuItemId,
              sortOrder: dailyMenuItems.sortOrder,
              isPlatoDelDia: dailyMenuItems.isPlatoDelDia,
            })
            .from(dailyMenuItems)
            .where(eq(dailyMenuItems.date, fromDate)),
          tx
            .select({
              adicionalItemId: dailyAdicionales.adicionalItemId,
              sortOrder: dailyAdicionales.sortOrder,
            })
            .from(dailyAdicionales)
            .where(eq(dailyAdicionales.date, fromDate)),
          tx
            .select({
              bebidaItemId: dailyBebidas.bebidaItemId,
              sortOrder: dailyBebidas.sortOrder,
            })
            .from(dailyBebidas)
            .where(eq(dailyBebidas.date, fromDate)),
          tx
            .select({
              contornoItemId: dailyContornos.contornoItemId,
              sortOrder: dailyContornos.sortOrder,
            })
            .from(dailyContornos)
            .where(eq(dailyContornos.date, fromDate)),
        ]);

        // Borrar el día destino — todo dentro de la misma transacción
        await tx.delete(dailyMenuItems).where(eq(dailyMenuItems.date, toDate));
        await tx.delete(dailyAdicionales).where(eq(dailyAdicionales.date, toDate));
        await tx.delete(dailyBebidas).where(eq(dailyBebidas.date, toDate));
        await tx.delete(dailyContornos).where(eq(dailyContornos.date, toDate));

        // Insertar el menú fuente en el día destino
        if (items.length > 0)
          await tx.insert(dailyMenuItems).values(
            items.map((i) => ({
              menuItemId: i.menuItemId,
              date: toDate,
              sortOrder: i.sortOrder,
              isPlatoDelDia: i.isPlatoDelDia,
            }))
          );
        if (ads.length > 0)
          await tx.insert(dailyAdicionales).values(
            ads.map((i) => ({
              adicionalItemId: i.adicionalItemId,
              date: toDate,
              sortOrder: i.sortOrder,
            }))
          );
        if (bebs.length > 0)
          await tx.insert(dailyBebidas).values(
            bebs.map((i) => ({
              bebidaItemId: i.bebidaItemId,
              date: toDate,
              sortOrder: i.sortOrder,
            }))
          );
        if (conts.length > 0)
          await tx.insert(dailyContornos).values(
            conts.map((i) => ({
              contornoItemId: i.contornoItemId,
              date: toDate,
              sortOrder: i.sortOrder,
            }))
          );

        return items.length;
      });

      invalidateDailyMenuCache();
      revalidatePath("/admin/menu-del-dia");
      return { success: true, count };
    } catch (error) {
      logger.error("[copyDailyMenuFrom] Error", { error: String(error) });
      return { success: false, error: "Error al copiar el menú." };
    }
  });
