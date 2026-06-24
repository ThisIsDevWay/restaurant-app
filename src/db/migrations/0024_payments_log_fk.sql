ALTER TABLE "payments_log" ALTER COLUMN "order_id" DROP NOT NULL;
ALTER TABLE "payments_log" ADD CONSTRAINT "payments_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
