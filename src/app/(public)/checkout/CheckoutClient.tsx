"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { processCheckoutAction, type CheckoutResult } from "@/actions/checkout";
import { type CheckoutItem } from "@/lib/types/checkout";
import { formatBs } from "@/lib/money";
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react";
import { ReferenceEntry } from "@/components/public/checkout/ReferenceEntry";
import { WhatsAppPayment } from "@/components/public/checkout/WhatsAppPayment";
import { WaitingPayment } from "@/components/public/checkout/WaitingPayment";
import { PaymentSuccess } from "@/components/public/checkout/PaymentSuccess";
import { CheckoutForm } from "@/components/public/checkout/CheckoutForm";
import { PagoMovilScreen } from "@/components/public/checkout/PagoMovilScreen";
import { useCheckoutSurcharges } from "@/hooks/useCheckoutSurcharges";
import type { PaymentInitResult, BankDetails } from "@/lib/payment-providers";
import type { GpsCoords } from "@/components/public/checkout/CheckoutForm.types";

type CheckoutState =
  | { type: "form" }
  | { type: "enter_reference"; orderId: string; expiresAt: string; totalBsCents: number; bankDetails: BankDetails }
  | { type: "whatsapp"; orderId: string; waLink: string; prefilledMessage: string }
  | {
    type: "comprobante";
    orderId: string;
    totalBsCents: number;
    totalUsdCents: number;
    serverPrefilledMessage: string;
    serverWaLink: string;
    bankDetails: { bankName: string; bankCode: string; accountPhone: string; accountRif: string; };
    orderMode: string;
    deliveryAddress: string;
    gpsCoords: GpsCoords | null;
    orderExpirationMinutes?: number;
  }
  | { type: "waiting_auto"; orderId: string; expiresAt: string; totalBsCents: number; bankDetails: BankDetails }
  | { type: "success"; orderId: string; totalBsCents: number }
  | { type: "error"; message: string };

interface CheckoutSettings {
  rate: number | null;
  orderModeOnSiteEnabled: boolean;
  orderModeTakeAwayEnabled: boolean;
  orderModeDeliveryEnabled: boolean;
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  deliveryFeeUsdCents: number;
  deliveryCoverage: string | null;
  transferBankName: string;
  transferAccountName: string;
  transferAccountNumber: string;
  transferAccountRif: string;
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
  whatsappNumber: string;
  bankName: string;
  bankCode: string;
  accountPhone: string;
  accountRif: string;
  activePaymentProvider: string;
  orderExpirationMinutes: number;
}

export default function CheckoutClient({ initialSettings }: { initialSettings: CheckoutSettings }) {
  const items = useCartStore((s) => s.items);
  const cartTotalBsCents = useCartStore((s) => s.totalBsCents());
  const totalBsCentsFromRate = useCartStore((s) => s.totalBsCentsFromRate);
  const totalUsdCents = useCartStore((s) => s.totalUsdCents());
  const clearCart = useCartStore((s) => s.clearCart);
  const checkoutToken = useCartStore((s) => s.checkoutToken);
  const ensureCheckoutToken = useCartStore((s) => s.ensureCheckoutToken);
  const clearCheckoutToken = useCartStore((s) => s.clearCheckoutToken);
  const router = useRouter();
  const [state, setState] = useState<CheckoutState>({ type: "form" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totalBsCents, setTotalBsCents] = useState(() =>
    initialSettings.rate ? totalBsCentsFromRate(initialSettings.rate) : cartTotalBsCents
  );
  const [settings, setSettings] = useState<CheckoutSettings>(initialSettings);

  // Ensure token on mount
  useEffect(() => {
    ensureCheckoutToken();
  }, [ensureCheckoutToken]);

  // Compute surcharges from cart items + settings
  const { surcharges } = useCheckoutSurcharges({
    items,
    orderMode: null, // Will be set by form; we compute here for display
    settings,
    totalBsCents: cartTotalBsCents,
    totalUsdCents,
  });

  if (items.length === 0 && state.type === "form") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center bg-bg-app">
        <div className="w-20 h-20 rounded-full bg-border/30 flex items-center justify-center mb-6 animate-pulse">
            <AlertCircle className="w-10 h-10 text-primary/40" strokeWidth={1} />
        </div>
        <h2 className="text-[22px] font-display font-black text-text-main mb-2">
          Tu carrito está vacío
        </h2>
        <p className="text-[15px] text-text-muted mb-8 max-w-[280px] font-medium leading-relaxed">
          Explora nuestro menú y agrega tus platos favoritos para continuar.
        </p>
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-[240px] rounded-2xl bg-primary px-6 py-4 text-[15px] font-display font-bold text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
        >
          Explorar menú
        </button>
      </div>
    );
  }

  const handleSubmit = async (
    phone: string,
    paymentMethod: "pago_movil" | "transfer",
    name?: string,
    cedula?: string,
    orderMode?: "on_site" | "take_away" | "delivery",
    deliveryAddress?: string,
    clientSurcharges?: typeof surcharges,
    gpsCoords?: GpsCoords | null,
  ) => {
    setIsSubmitting(true);
    setError(null);

    const checkoutItems: CheckoutItem[] = items.map((item) => {
      // Build adicionales array, converting contornoSubstitution back
      // to the old format the backend/DB expects
      const adicionales = item.selectedAdicionales.map((a) => ({
        id: a.id,
        name: a.name,
        priceUsdCents: a.priceUsdCents,
        priceBsCents: a.priceBsCents,
        quantity: a.quantity ?? 1,
      }));

      // If there are contorno substitutions, add them as adicionales with substitutesComponentId
      (item.contornoSubstitutions ?? []).forEach((s) => {
        adicionales.unshift({
          id: s.substituteId,
          name: s.substituteName,
          priceUsdCents: s.priceUsdCents,
          priceBsCents: s.priceBsCents,
          quantity: 1,
          substitutesComponentId: s.originalId,
          substitutesComponentName: s.originalName,
        } as any);
      });

      // Extract selected bebidas
      const bebidas = (item.selectedBebidas ?? []).map((b) => ({
        id: b.id,
        name: b.name,
        priceUsdCents: b.priceUsdCents,
        priceBsCents: b.priceBsCents,
        quantity: b.quantity ?? 1,
      }));

      return {
        id: item.id,
        quantity: item.quantity,
        fixedContornos: item.fixedContornos,
        selectedAdicionales: adicionales,
        selectedBebidas: bebidas,
        removedComponents: item.removedComponents,
        categoryAllowAlone: item.categoryAllowAlone,
        categoryIsSimple: item.categoryIsSimple,
        categoryName: item.categoryName,
      };
    });

    try {
      const token = checkoutToken ?? ensureCheckoutToken();
      const actionResult = await processCheckoutAction({
        input: { phone, paymentMethod, name, cedula, orderMode, deliveryAddress, items: checkoutItems.map((i) => ({ id: i.id, quantity: i.quantity })), clientSurcharges, checkoutToken: token },
        items: checkoutItems,
      });

      if (actionResult?.serverError || actionResult?.validationErrors) {
        setError(actionResult.serverError || "Error validando los datos del checkout");
        setIsSubmitting(false);
        return;
      }

      const result = actionResult?.data as CheckoutResult | undefined;

      if (!result) {
        setError(actionResult?.serverError || "Error validando datos");
        setIsSubmitting(false);
        return;
      }

      if (result.success) {
        const init = result.initResult;

        if (paymentMethod === "pago_movil" && settings.activePaymentProvider === "whatsapp_manual") {
          const finalSurchargesUsdTotal = clientSurcharges?.totalSurchargeUsdCents ?? 0;
          const finalGrandTotalUsdCents = totalUsdCents + finalSurchargesUsdTotal;
          const finalGrandTotalBsCents = totalBsCents + (settings.rate ? Math.round(finalSurchargesUsdTotal * settings.rate) : 0);

          setState({
            type: "comprobante",
            orderId: result.orderId,
            totalBsCents: finalGrandTotalBsCents,
            totalUsdCents: finalGrandTotalUsdCents,
            serverPrefilledMessage: init.screen === "whatsapp" ? init.prefilledMessage : "",
            serverWaLink: init.screen === "whatsapp" ? init.waLink : "",
            bankDetails: {
              bankName: settings.bankName,
              bankCode: settings.bankCode,
              accountPhone: settings.accountPhone,
              accountRif: settings.accountRif,
            },
            orderMode: orderMode ?? "on_site",
            deliveryAddress: deliveryAddress ?? "",
            gpsCoords: gpsCoords ?? null,
            orderExpirationMinutes: settings.orderExpirationMinutes,
          });
          setIsSubmitting(false);
          return;
        }

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
            bankDetails: "bankDetails" in init ? init.bankDetails : { bankName: "", bankCode: "", accountPhone: "", accountRif: "" } as BankDetails,
          });
        } else {
          setError("Método de pago no soportado por el momento.");
          setIsSubmitting(false);
        }
      } else {
        setError(result.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Checkout submit error:", err);
      setError("Ocurrió un error inesperado al procesar tu pedido. Intenta nuevamente.");
      setIsSubmitting(false);
    }
  };

  const handlePaid = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }

    // Get orderId from current state
    let orderId = "";
    if (state.type === "enter_reference" || state.type === "waiting_auto") {
      orderId = state.orderId;
    } else if (state.type === "whatsapp") {
      orderId = state.orderId;
    }

    // Store order in localStorage
    if (orderId && typeof window !== "undefined") {
      const orders = JSON.parse(localStorage.getItem("gm_orders") || "[]");
      orders.unshift({
        id: orderId,
        totalBsCents,
        createdAt: Date.now(),
      });
      // Keep only last 10 orders
      localStorage.setItem("gm_orders", JSON.stringify(orders.slice(0, 10)));
    }

    const bs =
      state.type === "enter_reference" || state.type === "waiting_auto"
        ? state.totalBsCents
        : totalBsCents;
    setState({ type: "success", orderId, totalBsCents: bs });
    clearCart();
    clearCheckoutToken();
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleRetry = () => {
    setState({ type: "form" });
    setError(null);
  };

  return (
    <div className={`min-h-[100dvh] pb-safe ${state.type === "form" ? "bg-bg-app" : "bg-bg-app"}`}>
      {/* Header for non-form states */}
      {state.type !== "form" && state.type !== "success" && (
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-bg-card px-5 py-4 shadow-sm">
          <button
            onClick={() => {
              // Go back to form from payment screens
              setState({ type: "form" });
              setError(null);
            }}
            className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center cursor-pointer active:bg-surface-section transition-colors"
            aria-label="Volver"
          >
            <ChevronLeft className="w-4 h-4 text-text-main" strokeWidth={2.5} />
          </button>
          <h1 className="text-[17px] font-display font-bold text-text-main">
            Finalizar pedido
          </h1>
        </header>
      )}

      {state.type === "form" && (
        <CheckoutForm
          items={items}
          totalBsCents={totalBsCents}
          totalUsdCents={totalUsdCents}
          isSubmitting={isSubmitting}
          error={error}
          onSubmit={handleSubmit}
          settings={settings}
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

      {state.type === "comprobante" && (
        <PagoMovilScreen
          orderId={state.orderId}
          totalBsCents={state.totalBsCents}
          totalUsdCents={state.totalUsdCents}
          bankDetails={state.bankDetails}
          serverPrefilledMessage={state.serverPrefilledMessage}
          serverWaLink={state.serverWaLink}
          gpsCoords={state.gpsCoords}
          orderExpirationMinutes={state.orderExpirationMinutes}
          onVolver={() => setState({ type: "form" })}
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
          orderId={state.orderId}
          exactAmountBsCents={state.totalBsCents}
          items={items}
        />
      )}

      {state.type === "error" && (
        <div className="flex flex-col items-center px-6 pt-24 text-center bg-bg-app min-h-screen">
          <div className="w-16 h-16 rounded-3xl bg-error/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-error" />
          </div>
          <h2 className="text-[22px] font-display font-black text-text-main mb-2">
            Algo salió mal
          </h2>
          <p className="text-[15px] text-text-muted mb-10 max-w-[280px] font-medium leading-relaxed">
            {state.message || "Ocurrió un error inesperado al procesar tu pedido."}
          </p>
          <div className="flex flex-col w-full max-w-[280px] gap-3">
            <button
              onClick={handleRetry}
              className="w-full rounded-2xl bg-primary px-6 py-4 text-[15px] font-display font-bold text-white shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={() => router.push("/")}
              className="w-full rounded-2xl border-2 border-border bg-bg-card px-6 py-4 text-[15px] font-display font-bold text-text-main active:bg-surface-section transition-all"
            >
              Volver al menú
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
