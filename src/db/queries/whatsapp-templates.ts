import { db } from "../index";
import { whatsappTemplates } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllTemplates() {
  return db.select().from(whatsappTemplates).orderBy(whatsappTemplates.key);
}

export async function getTemplateByKey(key: string) {
  const [row] = await db
    .select()
    .from(whatsappTemplates)
    .where(eq(whatsappTemplates.key, key))
    .limit(1);
  return row ?? null;
}

export async function upsertTemplate(key: string, body: string) {
  const [row] = await db
    .update(whatsappTemplates)
    .set({ body, updatedAt: new Date() })
    .where(eq(whatsappTemplates.key, key))
    .returning();
  return row;
}

export async function toggleTemplateActive(key: string, isActive: boolean) {
  const [row] = await db
    .update(whatsappTemplates)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(whatsappTemplates.key, key))
    .returning();
  return row;
}

export async function seedDefaultTemplates() {
  const existing = await getAllTemplates();
  if (existing.length > 0) return;

  const defaults = [
    {
      key: "received",
      label: "Pedido recibido",
      body: [
        "✅ *Pedido {numeroPedido}*",
        "{modoPedido}",
        "",
        "Hola {nombre}, recibimos tu pedido:",
        "",
        "{items}",
        "{packagingFee}",
        "",
        "🧾 Base imponible: {baseImponible}",
        "📌 IVA (16%): {iva}",
        "💰 *Total: {total}*",
        "💵 Equiv. {ref}",
        "",
        "Hemos recibido tu pedido. Una vez confirmemos tu pago, empezaremos con la preparación. 🍽️",
      ].join("\n"),
    },
    {
      key: "paid",
      label: "Pago confirmado",
      body: [
        "✅ *Pago confirmado*",
        "",
        "Pedido {numeroPedido} verificado. {modoPedido}",
        "",
        "💰 *Total: {total}*",
        "💵 {ref}",
        "",
        "Tu pedido ha sido enviado a cocina para su preparación. 👨‍🍳",
      ].join("\n"),
    },
    {
      key: "kitchen",
      label: "En cocina",
      body: [
        "🍳 *Pedido {numeroPedido}*",
        "",
        "Tu pedido está siendo preparado.",
        "⏱️ Tiempo estimado: *{tiempoEstimado}*",
        "",
        "Te avisamos cuando salga. 👨‍🍳",
      ].join("\n"),
    },
    {
      key: "delivered",
      label: "En camino",
      body: [
        "🛵 *Pedido {numeroPedido}*",
        "",
        "¡Tu pedido está listo!",
        "",
        "¡Buen provecho! 🍽️",
      ].join("\n"),
    },
    {
      key: "checkout_manual",
      label: "Pago Manual Cliente",
      body: [
        "🍔 *Nuevo pedido {restaurantName}*",
        "{modoPedido}",
        "",
        "📋 Detalle:",
        "{items}",
        "{packagingFee}",
        "",
        "💰 Total: *{total}* ({ref})",
        "📱 Teléfono: {telefono}",
        "",
        "¿Cómo deseas pagar?",
        "□ Pago Móvil",
        "□ Transferencia",
        "□ Efectivo al recibir",
      ].join("\n"),
    },
  ];

  await db.insert(whatsappTemplates).values(defaults);
}
