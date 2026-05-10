import * as v from "valibot";

export const pairCodeSchema = v.pipe(
  v.string(),
  v.regex(/^[0-9]{4}$/, "El código debe tener 4 dígitos"),
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

export const updateTvMediaSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  title: v.optional(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
  durationSeconds: v.optional(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(600)),
  ),
  isActive: v.optional(v.boolean()),
  muted: v.optional(v.boolean()),
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
