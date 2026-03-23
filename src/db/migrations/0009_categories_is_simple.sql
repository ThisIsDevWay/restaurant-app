ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_simple BOOLEAN NOT NULL DEFAULT false;

UPDATE categories SET is_simple = true WHERE LOWER(name) IN ('bebidas', 'adicionales');

-- Clean up incorrect contornos/adicionales links for simple categories
DELETE FROM menu_item_contornos WHERE menu_item_id IN (
  SELECT mi.id FROM menu_items mi
  JOIN categories c ON c.id = mi.category_id
  WHERE c.is_simple = true
);

DELETE FROM menu_item_adicionales WHERE menu_item_id IN (
  SELECT mi.id FROM menu_items mi
  JOIN categories c ON c.id = mi.category_id
  WHERE c.is_simple = true
);
