CREATE TABLE IF NOT EXISTS menu_item_bebidas (
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  bebida_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, bebida_item_id)
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS adicionales_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bebidas_enabled BOOLEAN NOT NULL DEFAULT true;
