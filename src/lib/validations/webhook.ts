import * as v from "valibot";

export const webhookSchema = v.object({
  amount: v.optional(v.number()),
  reference: v.optional(v.string()),
  phone: v.optional(v.string()),
  timestamp: v.optional(v.number()),
});

export type WebhookInput = v.InferOutput<typeof webhookSchema>;

export const localNotificationSchema = v.object({
  sender: v.pipe(v.string(), v.minLength(1, "Sender es requerido")),
  message: v.pipe(v.string(), v.minLength(1, "Message es requerido")),
  source: v.optional(v.picklist(["sms", "app_notification"] as const)),
  receiveTime: v.optional(v.string()),
});

export type LocalNotificationInput = v.InferOutput<typeof localNotificationSchema>;
