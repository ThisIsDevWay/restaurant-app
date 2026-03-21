CREATE TABLE IF NOT EXISTS contornos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_usd_cents integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_item_contornos (
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  contorno_id uuid NOT NULL REFERENCES contornos(id) ON DELETE CASCADE,
  removable boolean NOT NULL DEFAULT false,
  substitute_contorno_ids uuid[] NOT NULL DEFAULT '{}',
  PRIMARY KEY (menu_item_id, contorno_id)
);
