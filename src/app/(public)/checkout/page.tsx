"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { processCheckout, type CheckoutResult, type CheckoutItem } from "@/actions/checkout";
import { formatBs } from "@/lib/money";
import { Loader2, AlertCircle } from "lucide-react";
import { ReferenceEntry } from "@/components/public/checkout/ReferenceEntry";
import { WhatsAppPayment } from "@/components/public/checkout/WhatsAppPayment";
import { WaitingPayment } from "@/components/public/checkout/WaitingPayment";
import { PaymentSuccess } from "@/components/public/checkout/PaymentSuccess";
import { CheckoutForm } from "@/components/public/checkout/CheckoutForm";
import type { PaymentInitResult } from "@/lib/payment-providers";

type CheckoutState =
  | { type: "form" }
  | { type: "enter_reference"; orderId: string; expiresAt: string; totalBsCents: number; bankDetails: { bankName: string; bankCode: string; accountPhone: string; accountRif: string } }
  | { type: "whatsapp"; orderId: string; waLink: string; prefilledMessage: string }
  | { type: "waiting_auto"; orderId: string; expiresAt: string; totalBsCents: number; bankDetails: { bankName: string; bankCode: string; accountPhone: string; accountRif: string } }
  | { type: "success"; totalBsCents: number }
  | { type: "error"; message: string };

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const totalBsCents = useCartStore((s) => s.totalBsCents());
  const totalUsdCents = useCartStore((s) => s.totalUsdCents());
  const clearCart = useCartStore((s) => s.clearCart);
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({ type: "form" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0 && state.type === "form") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-lg font-semibold text-text-main">
          Tu carrito está vacío
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Agrega items del menú para continuar
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-input bg-primary px-6 py-2.5 text-sm font-semibold text-white"
        >
          Ver menú
        </button>
      </div>
    );
  }

  const handleSubmit = async (
    phone: string,
    paymentMethod: "pago_movil" | "transfer",
  ) => {
    setIsSubmitting(true);
    setError(null);

    const checkoutItems: CheckoutItem[] = items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      selectedContorno: item.selectedContorno,
      selectedAdicionales: item.selectedAdicionales.map((a) => ({
        id: a.id,
        name: a.name,
        priceUsdCents: a.priceUsdCents,
        priceBsCents: a.priceBsCents,
        substitutesComponentId: a.substitutesComponentId,
      })),
      removedComponents: item.removedComponents,
      categoryAllowAlone: item.categoryAllowAlone,
    }));

    const result: CheckoutResult = await processCheckout(
      { phone, paymentMethod, items: checkoutItems.map((i) => ({ id: i.id, quantity: i.quantity })) },
      checkoutItems,
    );

    if (result.success) {
      const init = result.initResult;
      if (init.screen === "enter_reference") {
        setState({
          type: "enter_reference",
          orderId: result.orderId,
          expiresAt: result.expiresAt,
          totalBsCents: init.totalBsCents,
          bankDetails: init.bankDetails,
        });
      } else if (init.screen === "whatsapp") {
        setState({
          type: "whatsapp",
          orderId: result.orderId,
          waLink: init.waLink,
          prefilledMessage: init.prefilledMessage,
        });
      } else if (init.screen === "waiting_auto" || init.screen === "c2p_pending") {
        setState({
          type: "waiting_auto",
          orderId: result.orderId,
          expiresAt: result.expiresAt,
          totalBsCents: "totalBsCents" in init ? init.totalBsCents : 0,
          bankDetails: "bankDetails" in init ? init.bankDetails : { bankName: "", bankCode: "", accountPhone: "", accountRif: "" },
        });
      }
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const handlePaid = () => {
    clearCart();
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
    const bs =
      state.type === "enter_reference" || state.type === "waiting_auto"
        ? state.totalBsCents
        : totalBsCents;
    setState({ type: "success", totalBsCents: bs });
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleRetry = () => {
    setState({ type: "form" });
    setError(null);
  };

  return (
    <div className="min-h-screen bg-bg-app">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button
          onClick={() => {
            if (state.type === "form") {
              router.back();
            }
          }}
          className="text-text-main"
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="text-base font-semibold text-text-main">
          {state.type === "form" ? "Checkout" : "Confirmar pago"}
        </h1>
      </header>

      {state.type === "form" && (
        <CheckoutForm
          items={items}
          totalBsCents={totalBsCents}
          totalUsdCents={totalUsdCents}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
        />
      )}

      {state.type === "enter_reference" && (
        <ReferenceEntry
          orderId={state.orderId}
          expiresAt={state.expiresAt}
          totalBsCents={state.totalBsCents}
          bankDetails={state.bankDetails}
          items={items}
          onPaid={handlePaid}
          onError={handleError}
        />
      )}

      {state.type === "whatsapp" && (
        <WhatsAppPayment
          orderId={state.orderId}
          waLink={state.waLink}
          prefilledMessage={state.prefilledMessage}
          items={items}
          totalBsCents={totalBsCents}
          onPaid={handlePaid}
        />
      )}

      {state.type === "waiting_auto" && (
        <WaitingPayment
          orderId={state.orderId}
          expiresAt={state.expiresAt}
          totalBsCents={state.totalBsCents}
          bankDetails={state.bankDetails}
          items={items}
          onPaid={handlePaid}
        />
      )}

      {state.type === "success" && (
        <PaymentSuccess
          exactAmountBsCents={state.totalBsCents}
          items={items}
        />
      )}

      {state.type === "error" && (
        <div className="flex flex-col items-center px-4 pt-20 text-center">
          <AlertCircle className="h-12 w-12 text-amber" />
          <h2 className="mt-4 text-xl font-bold text-text-main">
            Algo salió mal
          </h2>
          <p className="mt-2 text-sm text-text-muted">{state.message}</p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleRetry}
              className="rounded-input bg-primary px-6 py-2.5 text-sm font-semibold text-white"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-input border border-border px-6 py-2.5 text-sm font-semibold text-text-main"
            >
              Volver al menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
