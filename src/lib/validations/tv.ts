import * as v from "valibot";

export const pairCodeSchema = v.pipe(
  v.string(),
  v.regex(/^[A-Z2-9]{6}$/, "El código debe tener 6 caracteres alfanuméricos"),
);

export const pairTvDisplaySchema = v.object({
  code: pairCodeSchema,
  displayName: v.pipe(
    v.string(),
    v.minLength(1, "Nombre requerido"),
    v.maxLength(80, "Nombre demasiado largo"),
  ),
});

export const updateTvDisplaySchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(80))),
  orientation: v.optional(v.picklist(["auto", "landscape", "portrait"])),
  rotationDegrees: v.optional(v.picklist([0, 90, 180, 270])),
  audioEnabled: v.optional(v.boolean()),
  volumePercent: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100)),
  ),
  notes: v.optional(v.nullable(v.string())),
});

export const idSchema = v.object({ id: v.pipe(v.string(), v.uuid()) });

/* ─── Menu Board slide config (matches TvMenuBoardConfig in schema/tv.ts) ─── */

const menuBoardSourceSchema = v.union([
  v.object({
    type: v.literal("category"),
    categoryId: v.pipe(v.string(), v.uuid()),
  }),
  v.object({ type: v.literal("all_available") }),
  v.object({ type: v.literal("daily") }),
]);

export const menuBoardConfigSchema = v.object({
  kind: v.literal("menu_board"),
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
  subtitle: v.optional(v.pipe(v.string(), v.maxLength(200))),
  source: menuBoardSourceSchema,
  layout: v.picklist(["list", "grid", "grid2", "grid3"]),
  showPrices: v.boolean(),
  showDescriptions: v.boolean(),
  showImages: v.boolean(),
  currency: v.picklist(["usd", "ves", "both"]),
  maxItems: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(48))),
});

/* ─── Dayparting fields (optional on create/update) ──────────────── */

const minuteOfDaySchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(1439),
);
const daysMaskSchema = v.pipe(
  v.number(),
  v.integer(),
  v.minValue(0),
  v.maxValue(127),
);

export const createMenuBoardSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1), v.maxLength(200)),
  durationSeconds: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(3),
    v.maxValue(600),
  ),
  config: menuBoardConfigSchema,
  daypartStartMinutes: v.optional(v.nullable(minuteOfDaySchema)),
  daypartEndMinutes: v.optional(v.nullable(minuteOfDaySchema)),
  daypartDaysMask: v.optional(v.nullable(daysMaskSchema)),
});

export const updateTvMediaSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  durationSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(600)),
  ),
  isActive: v.optional(v.boolean()),
  muted: v.optional(v.boolean()),
  slideConfig: v.optional(v.nullable(menuBoardConfigSchema)),
  daypartStartMinutes: v.optional(v.nullable(minuteOfDaySchema)),
  daypartEndMinutes: v.optional(v.nullable(minuteOfDaySchema)),
  daypartDaysMask: v.optional(v.nullable(daysMaskSchema)),
});

export const reorderSchema = v.object({
  orderedIds: v.array(v.pipe(v.string(), v.uuid())),
});

export const eventCreateSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(120)),
  description: v.optional(v.nullable(v.string())),
  startsAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  endsAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  appliesToAllDisplays: v.optional(v.boolean(), false),
});

export const eventUpdateSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(120))),
  description: v.optional(v.nullable(v.string())),
  startsAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  endsAt: v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp()))),
  isActive: v.optional(v.boolean()),
  appliesToAllDisplays: v.optional(v.boolean()),
});

export const addEventMediaSchema = v.object({
  eventId: v.pipe(v.string(), v.uuid()),
  mediaIds: v.array(v.pipe(v.string(), v.uuid())),
});

export const removeEventMediaSchema = v.object({
  eventId: v.pipe(v.string(), v.uuid()),
  mediaId: v.pipe(v.string(), v.uuid()),
});

export const reorderEventMediaSchema = v.object({
  eventId: v.pipe(v.string(), v.uuid()),
  orderedIds: v.array(v.pipe(v.string(), v.uuid())),
});

export const assignEventSchema = v.object({
  eventId: v.pipe(v.string(), v.uuid()),
  displayIds: v.array(v.pipe(v.string(), v.uuid())),
});

export const setDisplayMediaSchema = v.object({
  displayId: v.pipe(v.string(), v.uuid()),
  /** Ordered list. Empty array = clear selection (display falls back to all global media). */
  mediaIds: v.array(v.pipe(v.string(), v.uuid())),
});
