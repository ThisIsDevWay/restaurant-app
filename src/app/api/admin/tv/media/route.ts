import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvMedia, tvEventMedia, tvEvents } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
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
 * GET /api/admin/tv/media
 * Lists all media (admin only).
 */
export async function GET() {
  await requireAdmin();

  const globalMedia = await db
    .select()
    .from(tvMedia)
    .where(eq(tvMedia.isGlobal, true))
    .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt));

  const eventMediaRows = await db
    .select({
      id: tvMedia.id,
      title: tvMedia.title,
      type: tvMedia.type,
      storageBucket: tvMedia.storageBucket,
      storagePath: tvMedia.storagePath,
      publicUrl: tvMedia.publicUrl,
      thumbnailUrl: tvMedia.thumbnailUrl,
      mimeType: tvMedia.mimeType,
      fileSizeBytes: tvMedia.fileSizeBytes,
      width: tvMedia.width,
      height: tvMedia.height,
      durationSeconds: tvMedia.durationSeconds,
      displayOrder: tvMedia.displayOrder,
      isActive: tvMedia.isActive,
      isGlobal: tvMedia.isGlobal,
      muted: tvMedia.muted,
      uploadedByUserId: tvMedia.uploadedByUserId,
      createdAt: tvMedia.createdAt,
      updatedAt: tvMedia.updatedAt,
      eventId: tvEvents.id,
      eventName: tvEvents.name,
    })
    .from(tvMedia)
    .innerJoin(tvEventMedia, eq(tvEventMedia.mediaId, tvMedia.id))
    .innerJoin(tvEvents, eq(tvEvents.id, tvEventMedia.eventId))
    .where(eq(tvMedia.isGlobal, false))
    .orderBy(desc(tvMedia.createdAt));

  return NextResponse.json({ media: globalMedia, eventMedia: eventMediaRows });
}

/**
 * POST /api/admin/tv/media
 * Multipart upload. Fields:
 *   - file: File (required) - image or video
 *   - title: string (required)
 *   - durationSeconds: number (optional, defaults to 10)
 *   - thumbnail: File (optional) - JPEG/PNG generated client-side from a video frame
 *   - width / height: numbers (optional)
 */
export async function POST(req: Request) {
  const session = await requireAdmin();
  const userId = session.user?.id as string | undefined;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const title = (form.get("title") as string | null)?.trim() ?? "";
  const durationRaw = form.get("durationSeconds") as string | null;
  const widthRaw = form.get("width") as string | null;
  const heightRaw = form.get("height") as string | null;
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
    return NextResponse.json(
      { error: "Tipo de archivo no permitido" },
      { status: 415 },
    );
  }

  let durationSeconds = 10;
  if (durationRaw) {
    const parsed = Number(durationRaw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 600) {
      durationSeconds = Math.floor(parsed);
    }
  }

  const width = widthRaw ? Number(widthRaw) : null;
  const height = heightRaw ? Number(heightRaw) : null;

  // Upload main file.
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

  // Optional thumbnail (only relevant for videos, but accept always).
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

  // Compute next displayOrder.
  const last = await db
    .select({ displayOrder: tvMedia.displayOrder })
    .from(tvMedia)
    .orderBy(desc(tvMedia.displayOrder))
    .limit(1);
  const nextOrder = (last[0]?.displayOrder ?? -1) + 1;

  const [row] = await db
    .insert(tvMedia)
    .values({
      title,
      type: mediaType,
      storageBucket: "tv-media",
      storagePath,
      publicUrl: upload.publicUrl,
      thumbnailUrl,
      mimeType: file.type,
      fileSizeBytes: file.size,
      width: Number.isFinite(width) ? (width as number) : null,
      height: Number.isFinite(height) ? (height as number) : null,
      durationSeconds,
      displayOrder: nextOrder,
      uploadedByUserId: userId ?? null,
    })
    .returning();

  revalidatePath("/admin/tv");
  revalidatePath("/admin/tv/media");
  return NextResponse.json({ media: row }, { status: 201 });
}
