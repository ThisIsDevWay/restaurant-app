ALTER TABLE "daily_menu_items" ADD COLUMN "is_plato_del_dia" boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "daily_menu_items_plato_del_dia_date_key"
  ON "daily_menu_items" ("date")
  WHERE "is_plato_del_dia" = true;
