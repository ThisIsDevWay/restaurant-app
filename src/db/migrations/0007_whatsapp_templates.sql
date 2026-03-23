CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default templates
INSERT INTO whatsapp_templates (key, label, body) VALUES
  ('received', 'Pedido recibido', '✅ Pedido {numeroPedido} recibido, {nombre}.\n{items}\nTotal: {total}\nEstamos preparando tu pedido.'),
  ('paid', 'Pago confirmado', '✅ Pago confirmado para pedido {numeroPedido}.\n{items}\nTotal: {total}'),
  ('kitchen', 'En cocina', '🍳 Tu pedido {numeroPedido} está en preparación.\nTiempo estimado: {tiempoEstimado}'),
  ('delivered', 'En camino', '🛵 ¡Pedido {numeroPedido} en camino!\nTiempo estimado de llegada: {tiempoEstimado}')
ON CONFLICT (key) DO NOTHING;
