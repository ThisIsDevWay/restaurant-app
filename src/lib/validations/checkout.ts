import * as v from "valibot";

export const checkoutSchema = v.object({
  phone: v.pipe(
    v.string(),
    v.regex(
      /^(0414|0424|0412|0416|0426)\d{7}$/,
      "Número de teléfono venezolano inválido",
    ),
  ),
  name: v.optional(v.pipe(v.string(), v.maxLength(50))),
  cedula: v.optional(v.pipe(v.string(), v.maxLength(20))),
  paymentMethod: v.picklist(["pago_movil", "transfer"]),
  orderMode: v.optional(v.picklist(["on_site", "take_away", "delivery"])),
  deliveryAddress: v.optional(v.pipe(v.string(), v.maxLength(200))),
  items: v.pipe(
    v.array(
      v.object({
        id: v.pipe(v.string(), v.uuid()),
        quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
      }),
    ),
    v.minLength(1, "Debe agregar al menos un item"),
  ),
});

export type CheckoutInput = v.InferOutput<typeof checkoutSchema>;
