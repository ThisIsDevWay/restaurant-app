CREATE TABLE IF NOT EXISTS daily_adicionales (
  date DATE NOT NULL,
  adicional_id UUID NOT NULL REFERENCES adicionales(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, adicional_id)
);

CREATE TABLE IF NOT EXISTS daily_bebidas (
  date DATE NOT NULL,
  bebida_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (date, bebida_item_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_adicionales_date ON daily_adicionales(date);
CREATE INDEX IF NOT EXISTS idx_daily_bebidas_date ON daily_bebidas(date);
