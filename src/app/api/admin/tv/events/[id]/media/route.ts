import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import {
  tvEventMedia,
  tvMedia,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  TV_MEDIA_ALLOWED_MIMES,
  TV_MEDIA_MAX_BYTES,
  buildStoragePath,
  inferMediaType,
  uploadTvMediaBuffer,
} from "@/lib/services/tv-media";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/tv/events/[id]/media
 *
 * Two modes:
 *   1) Multipart form with `file` -> upload + add to library + attach to event
 *   2) JSON body { mediaIds: [...] } -> attach existing media to event
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const userId = session.user?.id as string | undefined;
  const { id: eventId } = await ctx.params;

  const contentType = req.headers.get("content-type") ?? "";

  // Mode 2: JSON attach by IDs.
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as {
      mediaIds?: string[];
    };
    const ids = Array.isArray(body.mediaIds) ? body.mediaIds : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "Sin medios" }, { status: 400 });
    }
    const [maxRow] = await db
      .select({ max: sql<number>`COALESCE(MAX(${tvEventMedia.displayOrder}), -1)` })
      .from(tvEventMedia)
      .where(eq(tvEventMedia.eventId, eventId));
    const startOrder = (maxRow?.max ?? -1) + 1;

    const existing = await db
      .select({ mediaId: tvEventMedia.mediaId })
      .from(tvEventMedia)
      .where(eq(tvEventMedia.eventId, eventId));
    const existingSet = new Set(existing.map((r) => r.mediaId));
    const fresh = ids.filter((mediaId) => !existingSet.has(mediaId));

    if (fresh.length > 0) {
      await db.insert(tvEventMedia).values(
        fresh.map((mediaId, i) => ({
          eventId,
          mediaId,
          displayOrder: startOrder + i,
        })),
      );
    }
    revalidatePath("/admin/tv/events");
    return NextResponse.json({ added: fresh.length });
  }

  // Mode 1: multipart upload.
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const file = form.get("file");
  const title = (form.get("title") as string | null)?.trim() ?? "";
  const durationRaw = form.get("durationSeconds") as string | null;
  const thumbnail = form.get("thumbnail");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  }
  if (file.size > TV_MEDIA_MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo excede el máximo de ${Math.floor(TV_MEDIA_MAX_BYTES / 1024 / 1024)} MB` },
      { status: 413 },
    );
  }
  if (!TV_MEDIA_ALLOWED_MIMES.includes(file.type as never)) {
    return NextResponse.json(
      { error: `Tipo de archivo no permitido (${file.type})` },
      { status: 415 },
    );
  }
  const mediaType = inferMediaType(file.type);
  if (!mediaType) {
    return NextResponse.json({ error: "Tipo no soportado" }, { status: 415 });
  }
  let durationSeconds = 10;
  if (durationRaw) {
    const parsed = Number(durationRaw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 600) {
      durationSeconds = Math.floor(parsed);
    }
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = buildStoragePath(file.name);
  const upload = await uploadTvMediaBuffer({
    buffer,
    path: storagePath,
    contentType: file.type,
  });
  if (!upload.ok) {
    return NextResponse.json(
      { error: `Error al subir: ${upload.error}` },
      { status: 500 },
    );
  }

  let thumbnailUrl: string | null = null;
  if (thumbnail instanceof File && thumbnail.size > 0 && thumbnail.size < 5_000_000) {
    const thumbBuffer = Buffer.from(await thumbnail.arrayBuffer());
    const thumbPath = `${storagePath.replace(/\.[^.]+$/, "")}.thumb.jpg`;
    const thumbResult = await uploadTvMediaBuffer({
      buffer: thumbBuffer,
      path: thumbPath,
      contentType: thumbnail.type || "image/jpeg",
    });
    if (thumbResult.ok) thumbnailUrl = thumbResult.publicUrl;
  }

  const last = await db
    .select({ displayOrder: tvMedia.displayOrder })
    .from(tvMedia)
    .orderBy(desc(tvMedia.displayOrder))
    .limit(1);
  const nextLibraryOrder = (last[0]?.displayOrder ?? -1) + 1;

  // Insert into media library AND attach to this event.
  const [media] = await db
    .insert(tvMedia)
    .values({
      title,
      type: mediaType,
      storagePath,
      storageBucket: "tv-media",
      publicUrl: upload.publicUrl,
      thumbnailUrl,
      mimeType: file.type,
      fileSizeBytes: file.size,
      durationSeconds,
      displayOrder: nextLibraryOrder,
      uploadedByUserId: userId ?? null,
      // Event-specific uploads are hidden from the global library and
      // from the default playlist. They are only visible inside this event.
      isGlobal: false,
    })
    .returning();

  const [maxEventRow] = await db
    .select({ max: sql<number>`COALESCE(MAX(${tvEventMedia.displayOrder}), -1)` })
    .from(tvEventMedia)
    .where(eq(tvEventMedia.eventId, eventId));
  const eventOrder = (maxEventRow?.max ?? -1) + 1;
  await db.insert(tvEventMedia).values({
    eventId,
    mediaId: media.id,
    displayOrder: eventOrder,
  });

  revalidatePath("/admin/tv");
  revalidatePath("/admin/tv/events");
  return NextResponse.json({ media }, { status: 201 });
}

/**
 * DELETE /api/admin/tv/events/[id]/media?mediaId=...
 * Remove a media item from an event (does NOT delete the underlying media).
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id: eventId } = await ctx.params;
  const url = new URL(req.url);
  const mediaId = url.searchParams.get("mediaId");
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId requerido" }, { status: 400 });
  }
  await db
    .delete(tvEventMedia)
    .where(
      and(
        eq(tvEventMedia.eventId, eventId),
        eq(tvEventMedia.mediaId, mediaId),
      ),
    );
  revalidatePath("/admin/tv/events");
  return NextResponse.json({ ok: true });
}
