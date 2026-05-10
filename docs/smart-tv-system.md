# Smart TV System – Setup & Operations

This document explains how to enable the Smart TV advertising and pairing
feature added in migration `0008_smart_tv_system.sql`.

---

## 1. Database migration

The migration file is already in place:

```
src/db/migrations/0008_smart_tv_system.sql
```

Apply it however you normally apply migrations on this project:

- **Supabase SQL editor:** paste the contents of `0008_smart_tv_system.sql`
  and run.
- **Direct psql:**
  ```bash
  psql $DATABASE_URL_DIRECT -f src/db/migrations/0008_smart_tv_system.sql
  ```
- **drizzle-kit migrate:** if your local schema state is in sync with the
  rest of the team, `pnpm db:migrate` will pick this file up.

The migration creates 6 tables:
`tv_displays`, `tv_pairing_sessions`, `tv_media`, `tv_events`,
`tv_event_media`, `tv_event_assignments`.
It also adds a partial unique index on `tv_pairing_sessions.pairing_code`
that only enforces uniqueness for sessions still in `status = 'pending'`,
so codes can be reused after expiry.

> **Note on drift:** running `pnpm db:generate` currently asks an
> interactive question about the pre-existing `print_jobs` schema drift.
> That drift is unrelated to this feature; just apply
> `0008_smart_tv_system.sql` directly.

---

## 2. Supabase Storage bucket

Create a new public bucket called `tv-media`:

**Via Supabase Dashboard:**
1. Storage → New bucket
2. Name: `tv-media`
3. Public bucket: **YES**
4. File size limit: **100 MB**
5. Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif, video/mp4, video/webm`

**Via SQL (alternative):**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tv-media',
  'tv-media',
  true,
  104857600,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
);

-- Allow public read
CREATE POLICY "Public read tv-media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tv-media');

-- Writes are server-side only (using service_role), so no insert policy
-- for anon is required.
```

---

## 3. Cron job (optional but recommended)

Add a Vercel cron entry to clean up expired pairing sessions. Edit
`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/expire-orders", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/expire-tv-pairings", "schedule": "*/10 * * * *" }
  ]
}
```

The endpoint requires `Authorization: Bearer ${CRON_SECRET}` (same
secret as the existing crons).

---

## 4. How to use it

### Pairing a TV

1. On the Smart TV browser, navigate to:
   ```
   https://<your-domain>/tv
   ```
2. The TV displays a giant 4-digit code (refreshes every 5 minutes).
3. Log into the admin panel and go to **Smart TVs → Pantallas**.
4. Click **"Emparejar nueva TV"**, enter the code and a name (e.g. "TV Barra").
5. The TV transitions to the carousel within 3-5 seconds, no reload required.

### Uploading media

1. Go to **Smart TVs → Medios**.
2. Click **"Subir imagen o video"**.
3. Supported: JPG, PNG, WebP, GIF (any size up to 100 MB) and MP4, WebM
   (max 60 seconds, up to 100 MB).
4. The TV picks up new media within 5-10 seconds.
5. Drag-and-drop tiles to reorder. Click a tile to edit duration or
   deactivate.

### Special events

1. Go to **Smart TVs → Eventos** → **"Nuevo evento"**.
2. Give it a name (e.g. "Boda Pérez", "Festival de Pasta - Martes").
3. Optionally set start / end dates.
4. Toggle **"Aplicar a TODAS las TVs"** if it's a global event
   (festival nights), or leave off and assign individual TVs.
5. On the event detail page:
   - Upload media specific to this event, OR pick existing items from the
     library.
   - Reorder by drag-and-drop.
   - Assign individual TVs (if `applies to all` is off).
6. Toggle the event **Active** when you want the override to start.
7. While active, the matching TVs show ONLY this event's media. When you
   deactivate (or it expires by date), they fall back to the default
   library playlist.

### Orientation

Each TV has an `orientation` setting:
- **Auto:** Honor the TV's physical orientation. No CSS rotation.
- **Horizontal (landscape):** If the device is mounted vertically, the
  page rotates -90° via CSS.
- **Vertical (portrait):** If the device is mounted horizontally, the
  page rotates +90° via CSS.

There's also an **"Additional rotation"** field (0/90/180/270°) for
unusual mounting situations.

### Revoking a TV

In **Pantallas**, click **"Revocar"** on any TV. Within 5 seconds the TV
clears its token and returns to the pairing screen.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Code "no se encontró" when validating | Code expired (5 min limit) | The TV will auto-refresh; validate the new code |
| TV stuck on a single image (video frame 1) | Browser blocked video autoplay | Click anywhere on the TV once; the controller requests fullscreen + wake lock on the first gesture |
| Media uploaded but TV doesn't show it | Storage bucket isn't public | Recheck bucket policies (step 2 above) |
| TV dashboard shows offline | TV not polling | Open `/tv` in the browser; check network |
| Carousel "flickers" every poll | A `version` mismatch — should not happen unless content actually changed | Check server logs for hash collisions |

---

## 6. File map

**New files (43):**
- `src/db/schema/tv.ts` — 6 Drizzle tables
- `src/db/migrations/0008_smart_tv_system.sql` — DDL
- `src/lib/services/tv-pairing.ts` — code generation, token, validation
- `src/lib/services/tv-content.ts` — playlist resolver + heartbeat
- `src/lib/services/tv-media.ts` — Supabase Storage upload helpers
- `src/lib/validations/tv.ts` — Valibot schemas
- `src/actions/tv.ts` — admin server actions (16 actions)
- `src/app/api/tv/pair/init/route.ts`
- `src/app/api/tv/pair/check/route.ts`
- `src/app/api/tv/content/route.ts`
- `src/app/api/admin/tv/displays/route.ts`
- `src/app/api/admin/tv/media/route.ts`
- `src/app/api/admin/tv/events/route.ts`
- `src/app/api/admin/tv/events/[id]/route.ts`
- `src/app/api/admin/tv/events/[id]/media/route.ts`
- `src/app/api/cron/expire-tv-pairings/route.ts`
- `src/app/tv/layout.tsx` + `page.tsx` + 3 components
- `src/app/(admin)/admin/tv/` — overview, displays, media, events pages

**Modified files (2):**
- `src/db/schema/index.ts` — export new tables
- `src/components/admin/layout/Sidebar.tsx` — added "Smart TVs" link
