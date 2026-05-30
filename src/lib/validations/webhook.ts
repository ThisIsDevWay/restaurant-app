import * as v from "valibot";

export const webhookSchema = v.object({
  amount: v.optional(v.number()),
  reference: v.optional(v.string()),
  phone: v.optional(v.string()),
  timestamp: v.optional(v.number()),
});

export type WebhookInput = v.InferOutput<typeof webhookSchema>;
