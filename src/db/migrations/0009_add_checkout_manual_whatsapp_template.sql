INSERT INTO whatsapp_templates (key, label, body) VALUES
  ('checkout_manual', 'Pago Manual Cliente', '🍔 *Nuevo pedido G&M*\n\n📋 Detalle:\n{items}\n\n💰 Total: *Bs. {total}* (REF {ref})\n📱 Teléfono: {telefono}\n\n¿Cómo deseas pagar?\n□ Pago Móvil\n□ Transferencia\n□ Efectivo al recibir')
ON CONFLICT (key) DO NOTHING;
