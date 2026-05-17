import * as v from "valibot";

const menuItemBaseSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nombre requerido")),
  description: v.optional(v.string()),
  portionNote: v.optional(v.nullable(v.pipe(v.string(), v.maxLength(100, "Máximo 100 caracteres")))),
  includedNote: v.optional(v.nullable(v.string())),
  hideAdicionales: v.optional(v.boolean(), false),
  hideBebidas: v.optional(v.boolean(), false),
  contornos: v.optional(v.array(v.object({
    id: v.pipe(v.string(), v.uuid("ID de contorno inválido")),
    removable: v.boolean(),
  })), []),
  priceUsdCents: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(0, "Precio no puede ser negativo"),
  ),
  costUsdCents: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  categoryId: v.pipe(v.string(), v.uuid()),
  isAvailable: v.boolean(),
  isPrepackaged: v.optional(v.boolean(), false),
  imageUrl: v.optional(v.string()),
  sortOrder: v.optional(v.pipe(v.number(), v.integer())),
});

export const menuItemSchema = v.pipe(
  menuItemBaseSchema,
  v.check(
    (data) => {
      if ((data.hideAdicionales || data.hideBebidas) && !data.includedNote?.trim()) {
        return false;
      }
      return true;
    },
    'Debes especificar qué incluye el ítem cuando ocultas adicionales o bebidas.',
  ),
);

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
