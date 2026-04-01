"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { dailyMenuItems, dailyAdicionales, dailyBebidas, dailyContornos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";
import { adminActionClient } from "@/lib/safe-action";
import * as v from "valibot";

export const syncDailyMenuAction = adminActionClient
  .schema(v.object({ date: v.string(), menuItemIds: v.array(v.string()) }))
  .action(async ({ parsedInput: { date, menuItemIds } }) => {
    try {
      await db.delete(dailyMenuItems).where(eq(dailyMenuItems.date, date));

      if (menuItemIds.length > 0) {
        await db.insert(dailyMenuItems).values(
          menuItemIds.map((id, index) => ({
            menuItemId: id,
            date,
            sortOrder: index,
          }))
        );
      }

      revalidatePath("/");
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
      await db
        .delete(dailyAdicionales)
        .where(eq(dailyAdicionales.date, date));

      if (adicionalIds.length > 0) {
        await db.insert(dailyAdicionales).values(
          adicionalIds.map((id, index) => ({
            date,
            adicionalItemId: id,
            sortOrder: index,
          })),
        );
      }

      revalidatePath("/");
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
      await db.delete(dailyBebidas).where(eq(dailyBebidas.date, date));

      if (bebidaIds.length > 0) {
        await db.insert(dailyBebidas).values(
          bebidaIds.map((id, index) => ({
            date,
            bebidaItemId: id,
            sortOrder: index,
          })),
        );
      }

      revalidatePath("/");
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
      await db.delete(dailyContornos).where(eq(dailyContornos.date, date));

      if (contornoIds.length > 0) {
        await db.insert(dailyContornos).values(
          contornoIds.map((id, index) => ({
            date,
            contornoItemId: id,
            sortOrder: index,
          })),
        );
      }

      revalidatePath("/");
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
      const sourceItems = await db
        .select({
          menuItemId: dailyMenuItems.menuItemId,
          sortOrder: dailyMenuItems.sortOrder,
        })
        .from(dailyMenuItems)
        .where(eq(dailyMenuItems.date, fromDate));

      const sourceAdicionales = await db
        .select({
          adicionalItemId: dailyAdicionales.adicionalItemId,
          sortOrder: dailyAdicionales.sortOrder,
        })
        .from(dailyAdicionales)
        .where(eq(dailyAdicionales.date, fromDate));

      const sourceBebidas = await db
        .select({
          bebidaItemId: dailyBebidas.bebidaItemId,
          sortOrder: dailyBebidas.sortOrder,
        })
        .from(dailyBebidas)
        .where(eq(dailyBebidas.date, fromDate));

      const sourceContornos = await db
        .select({
          contornoItemId: dailyContornos.contornoItemId,
          sortOrder: dailyContornos.sortOrder,
        })
        .from(dailyContornos)
        .where(eq(dailyContornos.date, fromDate));

      // Clear destination
      await db.delete(dailyMenuItems).where(eq(dailyMenuItems.date, toDate));
      await db
        .delete(dailyAdicionales)
        .where(eq(dailyAdicionales.date, toDate));
      await db.delete(dailyBebidas).where(eq(dailyBebidas.date, toDate));
      await db.delete(dailyContornos).where(eq(dailyContornos.date, toDate));

      // Copy items
      if (sourceItems.length > 0) {
        await db.insert(dailyMenuItems).values(
          sourceItems.map((item) => ({
            menuItemId: item.menuItemId,
            date: toDate,
            sortOrder: item.sortOrder,
          })),
        );
      }

      if (sourceAdicionales.length > 0) {
        await db.insert(dailyAdicionales).values(
          sourceAdicionales.map((item) => ({
            date: toDate,
            adicionalItemId: item.adicionalItemId,
            sortOrder: item.sortOrder,
          })),
        );
      }

      if (sourceBebidas.length > 0) {
        await db.insert(dailyBebidas).values(
          sourceBebidas.map((item) => ({
            date: toDate,
            bebidaItemId: item.bebidaItemId,
            sortOrder: item.sortOrder,
          })),
        );
      }

      if (sourceContornos.length > 0) {
        await db.insert(dailyContornos).values(
          sourceContornos.map((item) => ({
            date: toDate,
            contornoItemId: item.contornoItemId,
            sortOrder: item.sortOrder,
          })),
        );
      }

      revalidatePath("/");
      revalidatePath("/admin/menu-del-dia");
      return { success: true, count: sourceItems.length };
    } catch (error) {
      logger.error("[copyDailyMenuFrom] Error", { error: String(error) });
      return { success: false, error: "Error al copiar el menú." };
    }
  });
