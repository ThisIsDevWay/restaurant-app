"use server";

import * as v from "valibot";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  tvDisplays,
  tvMedia,
  tvEvents,
  tvEventMedia,
  tvEventAssignments,
  tvDisplayMedia,
} from "@/db/schema";
import { adminActionClient } from "@/lib/safe-action";
import { validatePairingCode } from "@/lib/services/tv-pairing";
import { deleteTvMediaFromStorage } from "@/lib/services/tv-media";
import {
  pairTvDisplaySchema,
  updateTvDisplaySchema,
  idSchema,
  updateTvMediaSchema,
  reorderSchema,
  eventCreateSchema,
  eventUpdateSchema,
  addEventMediaSchema,
  removeEventMediaSchema,
  reorderEventMediaSchema,
  assignEventSchema,
  setDisplayMediaSchema,
  createMenuBoardSchema,
} from "@/lib/validations/tv";

function revalidateTv() {
  revalidatePath("/admin/tv");
  revalidatePath("/admin/tv/displays");
  revalidatePath("/admin/tv/media");
  revalidatePath("/admin/tv/events");
}

/* ─────────────────────────── DISPLAYS ─────────────────────────── */

export const pairTvDisplayAction = adminActionClient
  .schema(pairTvDisplaySchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.user.id as string | undefined;
    if (!userId) return { success: false as const, error: "Sin sesión" };
    const result = await validatePairingCode({
      code: parsedInput.code,
      displayName: parsedInput.displayName,
      validatedByUserId: userId,
    });
    if (!result.ok) {
      const msg =
        result.reason === "not_found"
          ? "Código no encontrado. Verifica que la TV esté mostrando un código activo."
          : result.reason === "expired"
            ? "Código expirado. Refresca la pantalla de la TV."
            : "Código ya emparejado.";
      return { success: false as const, error: msg };
    }
    revalidateTv();
    return {
      success: true as const,
      displayId: result.displayId,
      displayName: result.displayName,
    };
  });

export const updateTvDisplayAction = adminActionClient
  .schema(updateTvDisplaySchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (rest.name !== undefined) updates.name = rest.name;
    if (rest.orientation !== undefined) updates.orientation = rest.orientation;
    if (rest.rotationDegrees !== undefined)
      updates.rotationDegrees = rest.rotationDegrees;
    if (rest.audioEnabled !== undefined)
      updates.audioEnabled = rest.audioEnabled;
    if (rest.volumePercent !== undefined)
      updates.volumePercent = rest.volumePercent;
    if (rest.notes !== undefined) updates.notes = rest.notes;

    try {
      const [row] = await db
        .update(tvDisplays)
        .set(updates)
        .where(eq(tvDisplays.id, id))
        .returning();
      revalidateTv();
      return { success: true as const, display: row };
    } catch {
      return { success: false as const, error: "Error al actualizar TV" };
    }
  });

export const revokeTvDisplayAction = adminActionClient
  .schema(idSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db
        .update(tvDisplays)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(tvDisplays.id, parsedInput.id));
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al revocar TV" };
    }
  });

/**
 * Replaces the per-display media selection in a single transaction.
 * Empty array clears the selection (the display will fall back to all global media).
 */
export const setDisplayMediaAction = adminActionClient
  .schema(setDisplayMediaSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(tvDisplayMedia)
          .where(eq(tvDisplayMedia.displayId, parsedInput.displayId));
        if (parsedInput.mediaIds.length > 0) {
          await tx.insert(tvDisplayMedia).values(
            parsedInput.mediaIds.map((mediaId, i) => ({
              displayId: parsedInput.displayId,
              mediaId,
              displayOrder: i,
            })),
          );
        }
      });
      revalidateTv();
      return { success: true as const, count: parsedInput.mediaIds.length };
    } catch {
      return { success: false as const, error: "Error al guardar la selección" };
    }
  });

export const deleteTvDisplayAction = adminActionClient
  .schema(idSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db.delete(tvDisplays).where(eq(tvDisplays.id, parsedInput.id));
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al borrar TV" };
    }
  });

/* ───────────────────────────── MEDIA ───────────────────────────── */

export const updateTvMediaAction = adminActionClient
  .schema(updateTvMediaSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (rest.title !== undefined) updates.title = rest.title;
    if (rest.durationSeconds !== undefined)
      updates.durationSeconds = rest.durationSeconds;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    if (rest.muted !== undefined) updates.muted = rest.muted;
    if (rest.slideConfig !== undefined) updates.slideConfig = rest.slideConfig;
    if (rest.daypartStartMinutes !== undefined)
      updates.daypartStartMinutes = rest.daypartStartMinutes;
    if (rest.daypartEndMinutes !== undefined)
      updates.daypartEndMinutes = rest.daypartEndMinutes;
    if (rest.daypartDaysMask !== undefined)
      updates.daypartDaysMask = rest.daypartDaysMask;

    try {
      const [row] = await db
        .update(tvMedia)
        .set(updates)
        .where(eq(tvMedia.id, id))
        .returning();
      revalidateTv();
      return { success: true as const, media: row };
    } catch {
      return { success: false as const, error: "Error al actualizar medio" };
    }
  });

/**
 * Creates a "live menu board" slide (type='menu_board'). No file upload — the
 * slide renders the current menu/category each time the TV polls.
 */
export const createMenuBoardAction = adminActionClient
  .schema(createMenuBoardSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.user.id as string | undefined;
    try {
      // Compute next displayOrder so the new slide appears at the end.
      const [last] = await db
        .select({ displayOrder: tvMedia.displayOrder })
        .from(tvMedia)
        .orderBy(desc(tvMedia.displayOrder))
        .limit(1);
      const nextOrder = (last?.displayOrder ?? -1) + 1;

      const [row] = await db
        .insert(tvMedia)
        .values({
          title: parsedInput.title,
          type: "menu_board",
          // File columns intentionally null for menu boards.
          storagePath: null,
          publicUrl: null,
          mimeType: null,
          fileSizeBytes: null,
          durationSeconds: parsedInput.durationSeconds,
          displayOrder: nextOrder,
          isActive: true,
          isGlobal: true,
          muted: true,
          slideConfig: parsedInput.config,
          daypartStartMinutes: parsedInput.daypartStartMinutes ?? null,
          daypartEndMinutes: parsedInput.daypartEndMinutes ?? null,
          daypartDaysMask: parsedInput.daypartDaysMask ?? null,
          uploadedByUserId: userId ?? null,
        })
        .returning();
      revalidateTv();
      return { success: true as const, media: row };
    } catch (err) {
      console.error("createMenuBoardAction failed", err);
      return { success: false as const, error: "Error al crear pantalla de menú" };
    }
  });

export const deleteTvMediaAction = adminActionClient
  .schema(idSchema)
  .action(async ({ parsedInput }) => {
    try {
      const [row] = await db
        .select({ storagePath: tvMedia.storagePath, thumbnailUrl: tvMedia.thumbnailUrl })
        .from(tvMedia)
        .where(eq(tvMedia.id, parsedInput.id))
        .limit(1);

      if (row?.storagePath) {
        // Delete main file — best-effort, never blocks the DB delete.
        await deleteTvMediaFromStorage(row.storagePath);

        // Delete thumbnail. The thumbnail path is always:
        //   {storagePath without extension}.thumb.jpg
        // Supabase returns ok:false for non-existent files — silently ignored.
        const thumbPath =
          row.storagePath.replace(/\.[^.]+$/, "") + ".thumb.jpg";
        await deleteTvMediaFromStorage(thumbPath);
      }

      await db.delete(tvMedia).where(eq(tvMedia.id, parsedInput.id));
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al borrar medio" };
    }
  });

export const reorderTvMediaAction = adminActionClient
  .schema(reorderSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Apply each new order in a single transaction for consistency.
      await db.transaction(async (tx) => {
        for (let i = 0; i < parsedInput.orderedIds.length; i++) {
          await tx
            .update(tvMedia)
            .set({ displayOrder: i, updatedAt: new Date() })
            .where(eq(tvMedia.id, parsedInput.orderedIds[i]));
        }
      });
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al reordenar" };
    }
  });

/* ───────────────────────────── EVENTS ───────────────────────────── */

export const createTvEventAction = adminActionClient
  .schema(eventCreateSchema)
  .action(async ({ parsedInput, ctx }) => {
    const userId = ctx.user.id as string | undefined;
    try {
      const [row] = await db
        .insert(tvEvents)
        .values({
          name: parsedInput.name,
          description: parsedInput.description ?? null,
          startsAt: parsedInput.startsAt
            ? new Date(parsedInput.startsAt)
            : null,
          endsAt: parsedInput.endsAt ? new Date(parsedInput.endsAt) : null,
          appliesToAllDisplays: parsedInput.appliesToAllDisplays ?? false,
          createdByUserId: userId ?? null,
        })
        .returning();
      revalidateTv();
      return { success: true as const, event: row };
    } catch {
      return { success: false as const, error: "Error al crear evento" };
    }
  });

export const updateTvEventAction = adminActionClient
  .schema(eventUpdateSchema)
  .action(async ({ parsedInput }) => {
    const { id, ...rest } = parsedInput;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (rest.name !== undefined) updates.name = rest.name;
    if (rest.description !== undefined) updates.description = rest.description;
    if (rest.startsAt !== undefined)
      updates.startsAt = rest.startsAt ? new Date(rest.startsAt) : null;
    if (rest.endsAt !== undefined)
      updates.endsAt = rest.endsAt ? new Date(rest.endsAt) : null;
    if (rest.isActive !== undefined) updates.isActive = rest.isActive;
    if (rest.appliesToAllDisplays !== undefined)
      updates.appliesToAllDisplays = rest.appliesToAllDisplays;

    try {
      const [row] = await db
        .update(tvEvents)
        .set(updates)
        .where(eq(tvEvents.id, id))
        .returning();
      revalidateTv();
      return { success: true as const, event: row };
    } catch {
      return { success: false as const, error: "Error al actualizar evento" };
    }
  });

export const deleteTvEventAction = adminActionClient
  .schema(idSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db.delete(tvEvents).where(eq(tvEvents.id, parsedInput.id));
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al borrar evento" };
    }
  });

export const addMediaToEventAction = adminActionClient
  .schema(addEventMediaSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Find current max displayOrder for this event so new entries go to the end.
      const [maxRow] = await db
        .select({ max: sql<number>`COALESCE(MAX(${tvEventMedia.displayOrder}), -1)` })
        .from(tvEventMedia)
        .where(eq(tvEventMedia.eventId, parsedInput.eventId));
      const startOrder = (maxRow?.max ?? -1) + 1;

      // Skip media that is already attached to this event.
      const existing = await db
        .select({ mediaId: tvEventMedia.mediaId })
        .from(tvEventMedia)
        .where(eq(tvEventMedia.eventId, parsedInput.eventId));
      const existingSet = new Set(existing.map((r) => r.mediaId));
      const fresh = parsedInput.mediaIds.filter((id) => !existingSet.has(id));

      if (fresh.length > 0) {
        await db.insert(tvEventMedia).values(
          fresh.map((mediaId, i) => ({
            eventId: parsedInput.eventId,
            mediaId,
            displayOrder: startOrder + i,
          })),
        );
      }
      revalidateTv();
      return { success: true as const, added: fresh.length };
    } catch {
      return { success: false as const, error: "Error al agregar medios" };
    }
  });

export const removeMediaFromEventAction = adminActionClient
  .schema(removeEventMediaSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db
        .delete(tvEventMedia)
        .where(
          and(
            eq(tvEventMedia.eventId, parsedInput.eventId),
            eq(tvEventMedia.mediaId, parsedInput.mediaId),
          ),
        );
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al quitar medio" };
    }
  });

export const reorderEventMediaAction = adminActionClient
  .schema(reorderEventMediaSchema)
  .action(async ({ parsedInput }) => {
    try {
      await db.transaction(async (tx) => {
        for (let i = 0; i < parsedInput.orderedIds.length; i++) {
          await tx
            .update(tvEventMedia)
            .set({ displayOrder: i })
            .where(
              and(
                eq(tvEventMedia.eventId, parsedInput.eventId),
                eq(tvEventMedia.mediaId, parsedInput.orderedIds[i]),
              ),
            );
        }
      });
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al reordenar" };
    }
  });

export const assignEventToDisplaysAction = adminActionClient
  .schema(assignEventSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Replace the assignment set in a single transaction.
      await db.transaction(async (tx) => {
        await tx
          .delete(tvEventAssignments)
          .where(eq(tvEventAssignments.eventId, parsedInput.eventId));
        if (parsedInput.displayIds.length > 0) {
          await tx.insert(tvEventAssignments).values(
            parsedInput.displayIds.map((displayId) => ({
              eventId: parsedInput.eventId,
              displayId,
            })),
          );
        }
      });
      revalidateTv();
      return { success: true as const };
    } catch {
      return { success: false as const, error: "Error al asignar evento" };
    }
  });

/* ────────────────────────── QUERIES (read) ────────────────────────── */

// These are not server actions strictly, but exported here for use by
// admin pages that need to list things. Kept "use server" so they can
// be called from client components if needed via RSC props.

export async function listTvDisplays() {
  return db
    .select()
    .from(tvDisplays)
    .orderBy(desc(tvDisplays.createdAt));
}

export async function listTvMedia() {
  return db
    .select()
    .from(tvMedia)
    .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt));
}

export async function listTvEvents() {
  return db
    .select()
    .from(tvEvents)
    .orderBy(desc(tvEvents.createdAt));
}
