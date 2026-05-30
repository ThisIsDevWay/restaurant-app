/**
 * Determines whether the customer has completed their side of the checkout
 * flow (Steps 4→5). An order can exist without the customer finishing:
 * they might have chosen a payment method and abandoned before confirming.
 *
 * 'complete'    – customer finished their checkout steps
 * 'incomplete'  – order exists but customer likely abandoned Step 4
 * 'terminated'  – order cancelled / expired / failed
 */
export type CheckoutFlowState = "complete" | "incomplete" | "terminated";

interface FlowOrder {
  status: string;
  paymentMethod: string;
  paymentMetadata?: { uploadedUrl?: string; cashAmountUsd?: string; acceptChangeBs?: boolean; [key: string]: any } | null;
}

export function checkoutFlowState(order: FlowOrder): CheckoutFlowState {
  const { status, paymentMethod, paymentMetadata } = order;

  // Terminated states
  if (["cancelled", "expired", "failed"].includes(status)) return "terminated";

  // Admin-confirmed states — definitively complete
  if (["paid", "kitchen", "ready", "delivered"].includes(status)) return "complete";

  // Efectivo: no digital confirmation step required — customer pays on delivery
  if (paymentMethod === "Efectivo $") return "complete";

  // Comprobante uploaded = customer completed their WhatsApp/upload step
  if (paymentMetadata?.uploadedUrl) return "complete";

  // pending / whatsapp without comprobante — customer may have abandoned
  return "incomplete";
}
