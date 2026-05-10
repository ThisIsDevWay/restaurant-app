import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/db";
import { tvMedia, tvDisplayMedia } from "@/db/schema";
import { and, asc, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/tv/displays/[id]/media
 *
 * Returns the data the "Configurar medios" dialog needs in a single call:
 *   - library:    all global media (the available pool)
 *   - selectedIds: ordered list of media currently assigned to this display
 *                  (empty array = display is using the default "show all" mode)
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id: displayId } = await ctx.params;

  const library = await db
    .select()
    .from(tvMedia)
    .where(and(eq(tvMedia.isGlobal, true), eq(tvMedia.isActive, true)))
    .orderBy(asc(tvMedia.displayOrder), desc(tvMedia.createdAt));

  const selected = await db
    .select({
      mediaId: tvDisplayMedia.mediaId,
      displayOrder: tvDisplayMedia.displayOrder,
    })
    .from(tvDisplayMedia)
    .where(eq(tvDisplayMedia.displayId, displayId))
    .orderBy(asc(tvDisplayMedia.displayOrder));

  return NextResponse.json({
    library,
    selectedIds: selected.map((s) => s.mediaId),
  });
}
