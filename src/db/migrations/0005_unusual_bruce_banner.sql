ALTER TABLE "settings" ALTER COLUMN "whatsapp_microservice_url" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_pago_movil_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_transfer_enabled" boolean DEFAULT true NOT NULL;