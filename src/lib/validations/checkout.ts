import * as v from "valibot";

// Client-supplied surcharges — validated structurally but server recalculates
const clientSurchargesSchema = v.nullish(v.object({
  plateCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  adicionalCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  bebidaCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  packagingUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  deliveryUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
  totalSurchargeUsdCents: v.pipe(v.number(), v.integer(), v.minValue(0)),
}));

export const checkoutSchema = v.object({
  phone: v.pipe(
    v.string(),
    v.regex(
      /^(0414|0424|0412|0416|0426)\d{7}$/,
      "Numero de telefono venezolano invalido",
    ),
  ),
  name: v.nullish(v.pipe(v.string(), v.maxLength(50))),
  cedula: v.nullish(v.pipe(v.string(), v.maxLength(20))),
  paymentMethod: v.picklist(["pago_movil", "transfer"]),
  orderMode: v.nullish(v.picklist(["on_site", "take_away", "delivery"])),
  deliveryAddress: v.nullish(v.pipe(v.string(), v.maxLength(200))),
  gpsCoords: v.nullish(v.object({ lat: v.number(), lng: v.number(), accuracy: v.number() })),
  items: v.pipe(
    v.array(
      v.object({
        id: v.pipe(v.string(), v.uuid()),
        quantity: v.pipe(v.number(), v.integer(), v.minValue(1)),
      }),
    ),
    v.minLength(1, "Debe agregar al menos un item"),
  ),
  checkoutToken: v.pipe(v.string(), v.uuid()),
  clientSurcharges: v.nullish(clientSurchargesSchema),
});

export type CheckoutInput = v.InferOutput<typeof checkoutSchema>;
export type ClientSurcharges = NonNullable<CheckoutInput["clientSurcharges"]>;
