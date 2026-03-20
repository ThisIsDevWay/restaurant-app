import * as v from "valibot";

export const menuItemSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido")),
  description: v.optional(v.string()),
  priceUsdCents: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, "Precio debe ser mayor a 0"),
  ),
  categoryId: v.pipe(v.string(), v.uuid()),
  isAvailable: v.boolean(),
  imageUrl: v.optional(v.string()),
  sortOrder: v.pipe(v.number(), v.integer()),
});

export type MenuItemInput = v.InferOutput<typeof menuItemSchema>;

export const optionGroupSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1)),
  type: v.picklist(["radio", "checkbox"]),
  required: v.boolean(),
  sortOrder: v.pipe(v.number(), v.integer()),
  options: v.array(
    v.object({
      name: v.pipe(v.string(), v.minLength(1)),
      priceUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
      isAvailable: v.boolean(),
      sortOrder: v.pipe(v.number(), v.integer()),
    }),
  ),
});

export type OptionGroupInput = v.InferOutput<typeof optionGroupSchema>;
