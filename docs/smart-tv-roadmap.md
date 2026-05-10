# Smart TV System — Improvement Proposal

> Roadmap based on the 2025-2026 digital signage industry state-of-the-art,
> prioritized for the Los Portillos use case. Each item has business
> rationale, technical sketch, and effort estimate.

---

## 1. Where we stand today

What we already have:
- 4-digit pairing flow with persistent token
- Multi-TV management with online/offline indicator
- Image + video upload (Supabase Storage, 100 MB)
- Special events with media collections + targeted assignment
- Per-display orientation (auto/landscape/portrait + 0/90/180/270 rotation)
- Per-video mute toggle, per-display master audio + volume
- Polling-based real-time updates with version-hash anti-flicker
- Cron-based pairing-session cleanup

What the market expects in 2026 and we **don't** have yet:
- **Offline / network-resilient playback** (industry standard since 2020)
- **Dayparting / time-based scheduling** (breakfast / lunch / dinner content)
- **Multi-zone layouts** (menu + ad + ticker on same screen)
- **POS / menu integration** (huge opportunity — we already have `menu_items`)
- **Proof-of-play & audit logs** (compliance, ROI measurement)
- **Emergency takeover** (instant override across all TVs)
- **Templates & widgets** (weather, time, social, QR)
- **Content scheduling** (start/end dates per asset, recurring rules)
- **Multi-location support** (currently one tenant)
- **Audience-aware / AI personalization**

---

## 2. Gap analysis vs market leaders

| Capability | Yodeck | OptiSigns | ScreenCloud | **Us** |
|---|:---:|:---:|:---:|:---:|
| Multi-TV pairing | ✅ | ✅ | ✅ | ✅ |
| Image + video uploads | ✅ | ✅ | ✅ | ✅ |
| Per-asset scheduling | ✅ | ✅ | ✅ | 🟡 events only |
| **Dayparting (time-of-day)** | ✅ | ✅ | ✅ | ❌ |
| **Multi-zone layouts** | ✅ | ✅ | ✅ | ❌ |
| **Offline cache** | ✅ | ✅ | ✅ | ❌ |
| **POS integration** | 🟡 | 🟡 | 🟡 | ❌ (huge opportunity) |
| **Templates / widgets** | ✅ | ✅ | ✅ | ❌ |
| **Proof-of-play logs** | ✅ | ✅ | ✅ | ❌ |
| **Audit log (admin actions)** | ✅ | ✅ | ✅ | ❌ |
| **Emergency takeover** | ✅ | ✅ | ✅ | ❌ |
| **Screen takeover (push msg)** | ✅ | ✅ | 🟡 | ❌ |
| Per-video audio control | 🟡 | 🟡 | 🟡 | ✅ ahead of curve |
| Forced orientation/rotation | ✅ | ✅ | ✅ | ✅ |
| Multi-location | ✅ | ✅ | ✅ | ❌ |

**Where we're already competitive:** pairing UX, audio granularity, rotation control.
**Where we have the biggest restaurant-specific edge:** we own the data (menu, prices, availability, daily menus). Direct integration with the existing `menu_items` schema is something the SaaS players cannot do natively.

---

## 3. Roadmap — prioritized

### P0 — Production-readiness gaps (do first)

These are the items where the absence is a **production risk**, not a feature gap. Ship before any restaurant relies on this in service hours.

#### 3.1 Offline-resilient playback

**Why:** Restaurant internet drops (Venezuela context: routine power and ISP cuts). Today, if the TV loses network for >5s, polling fails and after 3 failures we show "Reconectando…". The carousel keeps playing the items it already has, but **new browser tabs or rebooted TVs can't start at all**, and any media that hasn't been fetched yet shows broken images / black video.

**What:**
- Service Worker that caches the entire playlist payload + each media file (image bytes, video bytes) locally on the TV.
- On poll: if network OK, refresh cache. If network down, fall back to cache.
- On boot: hydrate from cache instantly so the TV resumes playback without waiting for first poll.

**How:**
- Extend the existing Serwist setup (already in `src/app/sw.ts`) with a new caching strategy scoped to `/api/tv/content` and `tv-media/*` URLs.
- Strategy: **stale-while-revalidate** for the JSON, **cache-first** for media bytes.
- Cache eviction: LRU keep last N=50 items, max ~500 MB (Smart TV constraint).
- On the TV: don't disable SW for `/tv` (currently the TV layout opts out for freshness). Instead, register a SW *only* with the digital-signage caching strategy, separate from the customer-facing PWA.

**Effort:** 2-3 days. Touches `src/app/tv/sw-tv.ts` (new), `next.config.ts`, `TvController.tsx`.

---

#### 3.2 Auto-recovery & watchdog

**Why:** Smart TV browsers occasionally lock up or kill JS execution after long idle periods. PiSignage and similar systems advertise "99.7% uptime" because they implement watchdogs.

**What:**
- TV pings `/api/tv/heartbeat` independently of the content poll, every 60s, with `lastSeenAt` already updated.
- Client-side watchdog: if `setTimeout` doesn't fire when expected (drift > 10s) OR if the carousel has been on the same item for >5x its duration, **hard reload the page**.
- Server-side: admin can flag a TV as "needs reload" → next poll sets a `reloadAt` timestamp → client reloads.

**How:**
- Add `tvDisplays.reload_requested_at` column.
- New action `forceReloadTvDisplayAction` that bumps the timestamp.
- TvController: track `lastTickAt`, on each setInterval callback compare to expected; if drift, `window.location.reload()`.
- Honor `reload_requested_at` if newer than session start time.

**Effort:** 1 day.

---

#### 3.3 Time-based scheduling (dayparting)

**Why:** This is *the* standard restaurant signage feature. Breakfast menu 6-11 AM, lunch 11-3, dinner 5-10. Currently we have global on/off + special events. We can't say "this video only plays at lunch."

**What:**
- Per-media: optional `playRules` JSONB with shape:
  ```json
  {
    "daysOfWeek": [1,2,3,4,5],   // 0=Sun..6=Sat
    "startTime": "11:00",         // local time HH:MM
    "endTime": "15:00",
    "startDate": null,            // optional ISO
    "endDate": null
  }
  ```
- Resolver filters items by current Caracas time before returning.
- Admin UI: "Programación" tab on each media card with day chips + time pickers.

**How:**
- Add `play_rules JSONB` column to `tv_media`.
- Update `resolveContentForDisplay`: after fetching, filter items where rules match `now` in `America/Caracas`.
- Include hour-of-day in the version hash so the playlist refreshes when crossing time boundaries (or simpler: have the TV recompute on each poll, server already does this).
- Per-event scheduling already partially exists (startsAt/endsAt) — extend with daysOfWeek for "Festival de Pasta los martes".

**Effort:** 2 days. UI is the bulk.

---

### P1 — High value, restaurant-specific

These differentiate us from generic SaaS signage by leveraging the data we already have.

#### 3.4 Live menu integration (THE killer feature)

**Why:** We own the entire menu (`menu_items`, `daily_menu_items`, `categories`). Generic CMS platforms have to scrape PDFs or use awkward CSV uploads. We can render a beautiful menu board directly from the database, **automatically updated when prices change or items go out of stock**.

**What:**
- New asset type `menu_board` alongside `image` and `video`.
- Per menu_board:
  - Choose layout: full menu / category-filtered / daily menu / featured items
  - Style preset: "Casual" / "Elegante" / "Festivo"
  - Currency display: USD only / Bs only / both (we already have rate snapshots)
- TV renders the menu_board via a special route `/tv/render/menu-board/[id]` that's an iframe-able SSR page. Each menu_board renders for `durationSeconds` like an image.
- 86'ing: when admin toggles `menu_items.isAvailable=false`, item shows a strikethrough "Hoy no disponible" or hides entirely (admin choice).

**How:**
- Add `tv_media.kind text default 'media'` with values `media | menu_board`.
- Add `tv_media.menu_board_config JSONB` for layout preset.
- Render route: server component reads `menu_items` joined with categories, applies template, returns full HTML page.
- TV slide for menu_board: render an `<iframe>` of `/tv/render/menu-board/{id}?display={token}` with same crossfade as images.
- Real-time: menu changes already update `updated_at`. Include `MAX(menu_items.updated_at)` in the version hash so the TV refreshes when the kitchen marks something unavailable.

**Effort:** 4-5 days. New rendering layer + 2-3 templates designed by your designer.

**Restaurant impact:** Industry data shows 15% AOV uplift and 18.7% faster ordering with digital menu boards (when prices and availability are accurate).

---

#### 3.5 Multi-zone layouts

**Why:** Real signage rarely shows ONE thing fullscreen. Standard layouts: top 70% = video, bottom 30% = menu ticker; or left 50% = menu, right 50% = ad reel.

**What:**
- New entity: `tv_layouts` with definition like:
  ```json
  {
    "name": "Bar landscape",
    "orientation": "landscape",
    "zones": [
      { "id": "main",   "x": 0,  "y": 0,  "w": 70, "h": 100, "playlistRef": "default" },
      { "id": "side",   "x": 70, "y": 0,  "w": 30, "h": 70,  "playlistRef": "promo-only" },
      { "id": "ticker", "x": 70, "y": 70, "w": 30, "h": 30,  "playlistRef": "weather" }
    ]
  }
  ```
- Each TV is assigned an active layout (default = single fullscreen zone).
- Each zone has its own playlist (= existing media collection or filtered by tag).

**How:**
- Add `tv_layouts` and `tv_layout_zones` tables.
- Add `tv_displays.layout_id` FK.
- Update `/api/tv/content` to return `zones` array instead of (or in addition to) flat `items`.
- DisplayScreen: render a CSS grid of zones, each zone gets its own Carousel.
- Visual layout editor: drag-rectangle picker (defer this — start with hand-tuned presets like "Menu izquierda 70%", "Banner inferior 25%").

**Effort:** 5-7 days. Needs design thought.

---

#### 3.6 Tags + smart playlists

**Why:** Right now reordering is manual drag-drop. With tags ("promo", "navidad", "menú", "evento-boda") we can build smart playlists like "all media tagged 'promo' AND not expired" without manual curation.

**What:**
- `tv_media.tags text[]` array column.
- Smart playlist: filter rule (tags + date range + isActive).
- Events use the same rule mechanism instead of bespoke junction table (or co-exist).

**How:**
- Add `tags text[] default '{}'` to `tv_media`.
- Indexed via GIN: `CREATE INDEX tv_media_tags_idx ON tv_media USING GIN(tags)`.
- Admin UI: tag input with chip autocomplete based on existing tags.

**Effort:** 1 day.

---

#### 3.7 Audit log

**Why:** Compliance + diagnose "who deleted that video?" Industry standard, easy win.

**What:**
- New `tv_audit_log` table: `id, userId, action, entityType, entityId, metadata JSONB, createdAt`.
- Wrap key server actions with a logger call.
- Admin viewer at `/admin/tv/logs` with filters (user, action, date range).

**How:**
- Add table.
- Helper `logTvAction(ctx, action, entity, meta)` called inside each server action.
- Also extend public TV endpoints to log significant events (display revoked, pairing failed N times).

**Effort:** 1.5 days.

---

#### 3.8 Proof-of-play

**Why:** Required if you ever monetize ad slots (let suppliers like Coca-Cola pay to be on screens). Even without monetization, useful to know which ad ran how many times where.

**What:**
- TV reports back `{ mediaId, displayId, startedAt, durationMs }` to `/api/tv/play-event`.
- Aggregate table `tv_play_events` (append-only).
- Admin report: per-media play counts, per-display, per-day.

**How:**
- Batch reports: TV buffers events, posts every 30s or 20 events, whichever comes first.
- Use `INSERT INTO ... ON CONFLICT DO NOTHING` keyed on `(displayId, mediaId, startedAt)` for idempotency.
- Simple chart on the overview page using `recharts` (already in the project).

**Effort:** 2 days.

---

### P2 — Polish & engagement

#### 3.9 Templates & widgets

Built-in templates that users can assign without uploading anything:
- **Reloj + clima**: time + Caracas weather (free OpenWeather API)
- **QR de menú**: QR pointing to `/m/[qrToken]` (we already have this!) — "Escanea para pedir desde tu mesa"
- **Mensaje de bienvenida**: editable text card with brand colors
- **Ticker**: scrolling text from settings (e.g., promo of the day)
- **Hora pico promocional**: countdown to next happy hour

Each is a server-rendered component at `/tv/render/widget/{type}` that the carousel embeds via `<iframe>`. Widget config stored as `tv_media` rows with `kind='widget'` and `widget_config JSONB`.

**Effort:** 3-4 days for the framework + 5 starter widgets. Each new widget is then ~half a day.

---

#### 3.10 Screen takeover & emergency override

**Why:** Manager needs to push "Cierre temporal — disculpen las molestias" instantly to all TVs. Or "FUEGO — EVACUAR" in a true emergency.

**What:**
- Admin button "🚨 Tomar pantalla" with priority levels (info / warning / emergency).
- Posts a row to `tv_takeovers (id, level, message, mediaUrl?, expiresAt, displayIds[])`.
- Resolver checks active takeovers BEFORE everything else; if any matches the display, returns that single item with `priority: "takeover"`.
- TV renders takeover full-bleed with appropriate styling (emergency = red flashing border).
- One-click dismiss from admin.

**How:**
- New `tv_takeovers` table.
- Resolver priority order: emergency takeover → event → default playlist.
- Admin UI: floating "Take screens" button always visible.

**Effort:** 2 days.

---

#### 3.11 Asset scheduling (start/end dates per item)

**Why:** "Promo navidad" should auto-stop showing on Dec 26. Today admin has to manually deactivate.

**What:**
- `tv_media.publish_at timestamp` and `unpublish_at timestamp` (nullable).
- Resolver filters items where `now BETWEEN publish_at AND unpublish_at`.

**How:**
- Two columns + UI date pickers in the edit dialog.
- Cron sweep already running: optional notification when items unpublish.

**Effort:** 0.5 days.

---

#### 3.12 Network resilience UX

- Show "Modo offline" badge on the TV when running from cache (instead of just "Reconectando…").
- Admin overview: highlight TVs that haven't connected in >24h with a warning.
- Slack/email notification when a TV goes offline for >10 min during business hours.

**Effort:** 1 day (after offline cache lands in P0).

---

### P3 — Strategic / advanced

#### 3.13 Multi-location

If/when Los Portillos opens a second branch, signage needs scoping. Today everything is tenant-level. Add `locationId` to `tv_displays`, `tv_events`, optionally `tv_media`. Restrict admin views to their location. This is a 3-4 day refactor and only makes sense if multi-location is on the roadmap.

#### 3.14 Audience-aware content (AI)

Industry trend: camera-based age/gender detection → personalize content. **Highly recommended NOT to pursue** for a small restaurant — privacy concerns, GDPR/LOPD risk, and 5%-7% lift over basic dayparting doesn't justify the complexity. Skip.

#### 3.15 AI-assisted content

Realistic uses of generative AI we *could* add:
- Auto-generate ad image variations from a prompt + brand assets via an OpenAI image API call.
- Auto-write social-style captions for new dishes.
- Suggest an optimal `displayOrder` based on play counts and recent updates.

These are 1-day individual integrations once an OpenAI key is added. Treat as optional polish.

#### 3.16 Programmatic ad slots (DOOH)

If revenue-positive: expose a slot API for advertisers. Out of scope for an MVP but worth knowing the term — "programmatic DOOH" is forecasted to grow from $9B (2025) to $45.8B (2034).

---

## 4. Recommended next 4 sprints

| Sprint | Focus | Items |
|---|---|---|
| **1** | Production hardening | 3.1 Offline cache + 3.2 Watchdog |
| **2** | Restaurant differentiator | 3.4 Live menu integration |
| **3** | Scheduling & ops | 3.3 Dayparting + 3.7 Audit log + 3.11 Asset dates |
| **4** | Polish | 3.10 Takeover + 3.6 Tags + 3.9 First 3 widgets (clock, QR, ticker) |

After sprint 4, the system would feature-match Yodeck/OptiSigns for restaurant use cases AND have a unique advantage (live menu sync) that SaaS competitors don't.

Skip 3.13 (multi-location) until business needs it. Skip 3.14 (camera AI) entirely. 3.5 (multi-zone) is great but heavier — defer to sprint 5+ unless explicitly requested.

---

## 5. Smart TV hardware notes (for reference)

Industry research surfaced practical caveats worth documenting in the customer-facing setup guide:

- **Avoid consumer Tizen / WebOS TVs** for 24/7 use. Their browsers are based on outdated Chromium versions, have ~500 MB storage, screensaver after idle, and may not auto-resume the URL after a power cycle. Many CMS apps simply refuse to install on them.
- **Recommended hardware tiers (cheapest → most reliable):**
  1. **Android TV box (TCL, Xiaomi, ~$40)**: best value; auto-start with Kiosk Browser; 24/7 capable.
  2. **Raspberry Pi 4 + cheap monitor (~$80 + monitor)**: PiSignage / Anthias compatible; rock solid.
  3. **Commercial display (Samsung SSSP, LG Pro:Idiom, ~$800)**: certified for 24/7, native digital signage app support.
  4. **Consumer Smart TV (any)**: works but unreliable past 8h continuous; recommend daily power-cycle.
- **Each TV should have a dedicated power schedule**: power off 2 AM, power on 6 AM. Both saves panel life and resets any stuck states.

Add a "Hardware recomendado" section to `smart-tv-system.md` once you've validated 1-2 specific models.

---

## Sources

- [Restaurant Digital Signage Best Practices 2025 — FoodHub](https://foodhubforbusiness.com/blogs/guide-to-restaurant-digital-signage/)
- [Digital Signage for Restaurants 2025 Guide — KX Digital](https://kxdigitalsignage.com/blog/the-ultimate-guide-to-digital-signage-for-restaurants-2025.php)
- [Yodeck vs OptiSigns Comparison — CrownTV](https://www.crowntv-us.com/blog/yodeck-vs-optisigns/)
- [Top 7 Digital Signage Apps for Scheduling 2025 — Rise Vision](https://www.risevision.com/blog/top-7-digital-signage-apps-for-content-scheduling-2025)
- [Offline Digital Signage Guide — PiSignage](https://blog.pisignage.com/offline-digital-signage-how-to-keep-your-screens-running-when-the-internet-doesnt-2025-guide/)
- [Smart TV Limitations for Signage — ScreenCloud](https://help.screencloud.com/en/articles/10115418-why-certain-apps-can-not-display-on-older-samsung-tizen-lg-webos-signage-and-brightsign-models)
- [Samsung Tizen Web Engine Specs — Samsung Developer](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)
- [Proof of Play Tracking — ScreenCloud](https://help.screencloud.com/en/articles/10120931-proof-of-play-tracking-and-logging-content-displaying-on-your-digital-screens)
- [Audit Log Tracking — Play Digital Signage](https://playsignage.com/support/audit-log/)
- [Digital Signage Layouts and Widgets — DigitalSignage.NET](https://www.digitalsignage.net/layouts-and-widgets/)
- [Emergency Messaging & CAP — Carousel Signage](https://www.carouselsignage.com/solutions/emergency-messaging)
- [POS Integration with Digital Menu Boards — NoviSign](https://www.novisign.com/solutions/digital-menu-boards/restaurants/pos-integration/)
- [POS Integration via ERP — Navori](https://navori.com/digital-menu-boards/pos-integration/)
- [AI in Digital Signage 2025 — Visionect](https://www.visionect.com/blog/ai-in-digital-signage/)
- [Digital Signage Trends 2025 (AI/Retail/Automation) — Coherent Market Insights](https://www.coherentmarketinsights.com/blog/smart-technologies/digital-signage-trends-2025-ai-retail-automation-and-displays-2520)
- [Smart TVs for Digital Signage 2026 — OptiSigns](https://www.optisigns.com/post/smart-tv-for-digital-signage)
