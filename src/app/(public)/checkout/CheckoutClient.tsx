"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cartStore";
import { processCheckoutAction, fallbackToWhatsAppAction, type CheckoutResult } from "@/actions/checkout";
import { type CheckoutItem } from "@/lib/types/checkout";
import { useCheckoutSurcharges } from "@/hooks/useCheckoutSurcharges";
import type { PaymentInitResult } from "@/lib/payment-providers/types";
import type { GpsCoords, OrderMode } from "@/components/public/checkout/CheckoutForm.types";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

// New wizard chrome
import { WizardHeader } from "@/components/public/checkout/WizardHeader";
import { WizardProgress } from "@/components/public/checkout/WizardProgress";
import { WizardCartChip } from "@/components/public/checkout/WizardCartChip";
import { StickyCta } from "@/components/public/checkout/StickyCta";

// Step components
import { OrderModeSelector } from "@/components/public/checkout/OrderModeSelector";
import { CheckoutForm } from "@/components/public/checkout/CheckoutForm";
import { PaymentMethodSelector } from "@/components/public/checkout/PaymentMethodSelector";
import { Step4BankDetails } from "@/components/public/checkout/Step4BankDetails";
import dynamic from "next/dynamic";

const Step5Success = dynamic(
  () => import("@/components/public/checkout/Step5Success").then((mod) => mod.Step5Success),
  { ssr: false }
);

type WizardStep = 1 | 2 | 3 | 4 | 5;
type PaymentMethod = "pago_movil" | "transfer" | "efectivo" | "zelle" | "binance";

interface WizardState {
  step: WizardStep;
  submitting: boolean;
  error: string | null;

  // Step 1
  orderMode: OrderMode | null;

  // Step 2
  phone: string;
  name: string;
  cedula: string;
  address: string;
  gpsCoords: GpsCoords | null;
  isReturning: boolean;
  customerFieldsVisible: boolean;

  // Step 3
  payment: PaymentMethod | null;
  cashAmountUsd: string;
  acceptChangeBs: boolean | null;

  // Step 4-5 (post-order)
  orderId: string | null;
  expiresAt: string | null;
  initResult: PaymentInitResult | null;
}

/* ── sessionStorage persistence ── */
const CHECKOUT_STORAGE_KEY = "gm_checkout_state";
const CHECKOUT_TTL_MS = 30 * 60 * 1000;

interface PersistedCheckout {
  state: Partial<WizardState>;
  savedAt: number;
}

function persistCheckout(state: WizardState) {
  try {
    if (state.step < 4) return; // Only persist post-order states
    const payload: PersistedCheckout = { state, savedAt: Date.now() };
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch { }
}

function restoreCheckout(): Partial<WizardState> | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const { state, savedAt } = JSON.parse(raw) as PersistedCheckout;
    if (Date.now() - savedAt > CHECKOUT_TTL_MS) {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
      return null;
    }
    if (!state.step || state.step < 4) {
      sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function clearPersistedCheckout() {
  try { sessionStorage.removeItem(CHECKOUT_STORAGE_KEY); } catch { }
}

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
  paymentEfectivoEnabled: boolean;
  efectivoAskCashAmount?: boolean;
  efectivoAskChangeBs?: boolean;
  paymentZelleEnabled: boolean;
  zelleEmail?: string | null;
  zelleName?: string | null;
  paymentBinanceEnabled: boolean;
  binanceEmail?: string | null;
  binancePayId?: string | null;
  whatsappNumber: string;
  bankName: string;
  bankCode: string;
  accountPhone: string;
  accountRif: string;
  activePaymentProvider: string;
  orderExpirationMinutes: number;
}

const INITIAL_STATE: WizardState = {
  step: 1,
  submitting: false,
  error: null,
  orderMode: null,
  phone: "",
  name: "",
  cedula: "",
  address: "",
  gpsCoords: null,
  isReturning: false,
  customerFieldsVisible: false,
  payment: null,
  cashAmountUsd: "",
  acceptChangeBs: null,
  orderId: null,
  expiresAt: null,
  initResult: null,
};

const paymentTitles: Record<string, string> = {
  pago_movil: "Pago Móvil",
  transfer: "Transferencia",
  zelle: "Zelle",
  binance: "Binance Pay",
  efectivo: "Efectivo",
};

export default function CheckoutClient({ initialSettings }: { initialSettings: CheckoutSettings }) {
  const router = useRouter();
  const { isKeyboardOpen, keyboardHeight } = useKeyboardOpen();

  // Cart
  const items = useCartStore((s) => s.items);
  const cartTotalBsCents = useCartStore((s) => s.totalBsCents());
  const totalBsCentsFromRate = useCartStore((s) => s.totalBsCentsFromRate);
  const totalUsdCents = useCartStore((s) => s.totalUsdCents());
  const clearCart = useCartStore((s) => s.clearCart);
  const checkoutToken = useCartStore((s) => s.checkoutToken);
  const ensureCheckoutToken = useCartStore((s) => s.ensureCheckoutToken);
  const clearCheckoutToken = useCartStore((s) => s.clearCheckoutToken);

  const [state, setStateRaw] = useState<WizardState>(INITIAL_STATE);
  const [cartOpen, setCartOpen] = useState(false);

  // Persist post-order state
  const setState = useCallback((next: WizardState | ((prev: WizardState) => WizardState)) => {
    setStateRaw((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (resolved.step >= 4) persistCheckout(resolved);
      else clearPersistedCheckout();
      return resolved;
    });
  }, []);

  // Restore persisted state on mount
  useEffect(() => {
    const restored = restoreCheckout();
    if (restored) {
      setStateRaw((prev) => ({ ...prev, ...restored }));
    }
    ensureCheckoutToken();
  }, [ensureCheckoutToken]);



  // Customer lookup with debounce
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollAttemptsRef = useRef(0);

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phoneNumber}`);
      if (!res.ok) return;
      const data = await res.json();
      setStateRaw((prev) => ({
        ...prev,
        name: data.found ? (data.name ?? "") : "",
        cedula: data.found ? (data.cedula ?? "") : "",
        isReturning: data.found,
        customerFieldsVisible: true,
      }));
    } catch {
      setStateRaw((prev) => ({ ...prev, customerFieldsVisible: true }));
    }
  }, []);

  const handlePhoneChange = useCallback((raw: string) => {
    setStateRaw((prev) => ({ ...prev, phone: raw }));

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    if (raw.length === 11 && /^(0414|0424|0412|0416|0426)\d{7}$/.test(raw)) {
      lookupTimeoutRef.current = setTimeout(() => lookupCustomer(raw), 400);
      setState((prev) => ({ ...prev, customerFieldsVisible: false, isReturning: false }));
    } else {
      setState((prev) => ({
        ...prev,
        customerFieldsVisible: false,
        isReturning: false,
        name: "",
        cedula: "",
      }));
    }
  }, [lookupCustomer, setState]);

  // Surcharges
  const totalBsCents = initialSettings.rate
    ? totalBsCentsFromRate(initialSettings.rate)
    : cartTotalBsCents;

  const { surcharges, grandTotalBsCents, grandTotalUsdCents, itemCount } =
    useCheckoutSurcharges({
      items,
      orderMode: state.orderMode,
      settings: initialSettings,
      totalBsCents,
      totalUsdCents,
    });

  // Derive phone validity
  const phoneValid =
    state.phone.length === 11 &&
    /^(0414|0424|0412|0416|0426)\d{7}$/.test(state.phone);

  // Step 2 ready
  const step2Ready =
    phoneValid &&
    state.name.trim().length >= 2 &&
    state.cedula.trim().length >= 4 &&
    (state.orderMode !== "delivery" || state.address.trim().length > 3);

  // Step 3 ready
  const step3Ready = state.payment !== null;

  // ── Navigation ──────────────────────────────────────────────
  const goBack = () => {
    setState((prev) => ({
      ...prev,
      step: Math.max(1, prev.step - 1) as WizardStep,
      error: null,
    }));
  };

  const goNext = () => {
    setState((prev) => ({
      ...prev,
      step: Math.min(5, prev.step + 1) as WizardStep,
    }));
  };

  // ── Submit order (step 3 → step 4) ──────────────────────────
  const handleSubmitOrder = async () => {
    if (!state.payment || !state.orderMode) return;

    setState((prev) => ({ ...prev, submitting: true, error: null }));

    const checkoutItems: CheckoutItem[] = items.map((item) => {
      const adicionales = item.selectedAdicionales.map((a) => ({
        id: a.id,
        name: a.name,
        priceUsdCents: a.priceUsdCents,
        priceBsCents: a.priceBsCents,
        quantity: a.quantity ?? 1,
      }));

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
        input: {
          phone: state.phone,
          paymentMethod: state.payment,
          name: state.name.trim(),
          cedula: state.cedula.trim() || undefined,
          orderMode: state.orderMode,
          deliveryAddress: state.orderMode === "delivery" ? state.address.trim() : undefined,
          gpsCoords: state.gpsCoords,
          items: checkoutItems.map((i) => ({ id: i.id, quantity: i.quantity })),
          clientSurcharges: surcharges,
          checkoutToken: token,
          cashAmountUsd: state.cashAmountUsd || undefined,
          acceptChangeBs: state.acceptChangeBs ?? undefined,
        },
        items: checkoutItems,
      });

      if (actionResult?.serverError || actionResult?.validationErrors) {
        setState((prev) => ({
          ...prev,
          submitting: false,
          error: actionResult?.serverError || "Error al validar los datos",
        }));
        return;
      }

      const result = actionResult?.data as CheckoutResult | undefined;

      if (!result?.success) {
        setState((prev) => ({
          ...prev,
          submitting: false,
          error: result?.error || "Error al procesar el pedido",
        }));
        return;
      }

      const init = result.initResult;

      setState((prev) => ({
        ...prev,
        step: 4,
        submitting: false,
        error: null,
        orderId: result.orderId,
        expiresAt: result.expiresAt,
        initResult: init,
      }));
    } catch (err) {
      console.error("Checkout submit error:", err);
      setState((prev) => ({
        ...prev,
        submitting: false,
        error: "Ocurrió un error inesperado. Intenta nuevamente.",
      }));
    }
  };

  // ── Post-payment confirmed ───────────────────────────────────
  const handlePaid = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 200]);
    }
    if (state.orderId && typeof window !== "undefined") {
      const orders = JSON.parse(localStorage.getItem("gm_orders") || "[]");
      orders.unshift({ id: state.orderId, totalBsCents, createdAt: Date.now() });
      localStorage.setItem("gm_orders", JSON.stringify(orders.slice(0, 10)));
    }
    setState((prev) => ({ ...prev, step: 5, error: null }));
    clearPersistedCheckout();
    clearCart();
    clearCheckoutToken();
  }, [state.orderId, totalBsCents, setState, clearCart, clearCheckoutToken]);

  // Poll order status when on step 4 to auto-transition on background match
  useEffect(() => {
    if (state.step !== 4 || !state.orderId) return;

    let timeoutId: NodeJS.Timeout;
    let active = true;
    pollAttemptsRef.current = 0;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/orders/${state.orderId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "paid" && active) {
            handlePaid();
            return;
          }
          if (["expired", "cancelled", "failed"].includes(data.status) && active) {
            active = false;
            clearTimeout(timeoutId);
            clearPersistedCheckout();
            router.push("/checkout/expired");
            return;
          }
        }
      } catch {
        // ignore errors
      }

      if (active) {
        pollAttemptsRef.current++;
        const nextMs = Math.min(4000 + pollAttemptsRef.current * 2000, 16000);
        timeoutId = setTimeout(poll, nextMs);
      }
    };

    poll();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [state.step, state.orderId, handlePaid, router]);

  const handleFallbackWhatsApp = useCallback(async () => {
    if (!state.orderId) return;
    try {
      const res = await fallbackToWhatsAppAction({ orderId: state.orderId });
      const data = res?.data;
      if (data?.success && data.initResult) {
        setState((prev) => ({
          ...prev,
          initResult: data.initResult ?? null,
          error: null,
        }));
      } else {
        const errorMsg = data?.error || res?.serverError || "Error al cambiar a WhatsApp";
        setState((prev) => ({
          ...prev,
          error: errorMsg,
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        error: "Ocurrió un error al cambiar a WhatsApp",
      }));
    }
  }, [state.orderId, setState]);

  // ── New order / reset ────────────────────────────────────────
  const handleNewOrder = useCallback(() => {
    clearCart();
    clearCheckoutToken();
    clearPersistedCheckout();
    router.push("/");
  }, [clearCart, clearCheckoutToken, router]);

  // ── Empty cart ───────────────────────────────────────────────
  if (items.length === 0 && state.step === 1) {
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
          className="w-full max-w-[240px] rounded-full bg-primary px-6 py-4 text-[15px] font-semibold text-white shadow-elevated active:scale-[0.98] transition-all"
        >
          Explorar menú
        </button>
      </div>
    );
  }

  // ── Available order modes ────────────────────────────────────
  const availableModes = [
    { id: "on_site" as OrderMode, label: "En sitio", icon: null as any, enabled: initialSettings.orderModeOnSiteEnabled !== false, description: "Para comer en el local" },
    { id: "take_away" as OrderMode, label: "Para llevar", icon: null as any, enabled: initialSettings.orderModeTakeAwayEnabled !== false, description: "Retiro en local" },
    { id: "delivery" as OrderMode, label: "Delivery", icon: null as any, enabled: initialSettings.orderModeDeliveryEnabled !== false, description: "A domicilio" },
  ].filter((m) => m.enabled);

  const showChip = state.step >= 1 && state.step <= 4;
  const showBack = state.step > 1 && state.step < 5;

  return (
    <div className="min-h-[100dvh] bg-bg-app flex flex-col">
      {/* Cart chip (steps 1-4) */}
      {showChip && (
        <WizardCartChip
          cartItems={items}
          totalPlatos={itemCount}
          grandTotalUsdCents={grandTotalUsdCents}
          grandTotalBsCents={grandTotalBsCents}
          surcharges={surcharges}
          cartOpen={cartOpen}
          onOpenCart={() => setCartOpen(true)}
          onCloseCart={() => setCartOpen(false)}
          step={state.step}
        />
      )}

      {/* Wizard header */}
      {state.step < 5 && (
        <WizardHeader
          step={state.step}
          onBack={showBack ? goBack : undefined}
          backDisabled={state.submitting}
          hideBack={!showBack}
          onClose={() => router.push("/")}
          title={state.step === 4 && state.payment ? paymentTitles[state.payment] : undefined}
        />
      )}

      {/* Progress dots */}
      {state.step < 4 && <WizardProgress step={state.step} />}

      {/* Error banner */}
      {state.error && state.step < 4 && (
        <div className="mx-5 mt-3 px-4 py-3 bg-primary/10 border border-primary/20 text-primary text-[13px] rounded-[14px] animate-in fade-in">
          {state.error}
        </div>
      )}

      {/* ── STEP CONTENT ── */}
      <div className={`flex-1 px-5 pt-4 ${state.step < 5 ? "pb-36" : "pb-10"}`}>

        {/* Step 1 — Order mode */}
        {state.step === 1 && (
          <>
            <div className="mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                EMPECEMOS
              </p>
              <h1 className="font-display text-3xl font-bold text-text-main leading-tight">
                ¿Cómo lo <em className="not-italic text-primary">recibes</em>?
              </h1>
              <p className="font-sans text-[13px] text-text-muted mt-1">
                Elige cómo quieres recibir tu pedido
              </p>
            </div>

            <OrderModeSelector
              availableModes={availableModes}
              orderMode={state.orderMode}
              onSetOrderMode={(mode) => setState((prev) => ({ ...prev, orderMode: mode }))}
              settings={initialSettings}
              isSubmitting={state.submitting}
              surcharges={surcharges}
            />
          </>
        )}

        {/* Step 2 — Customer data */}
        {state.step === 2 && (
          <>
            <div className={cn("transition-all duration-150 ease-in-out", isKeyboardOpen ? "mb-0 h-0 opacity-0 overflow-hidden" : "mb-6")}>
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                {state.orderMode ? `${state.orderMode === "on_site" ? "En sitio" : state.orderMode === "take_away" ? "Para llevar" : "Delivery"} · datos del cliente` : "Tus datos"}
              </p>
              <h1 className="font-display text-3xl font-bold text-text-main leading-tight">
                ¿Quién <em className="not-italic text-primary">recibe</em>?
              </h1>
            </div>

            <CheckoutForm
              orderMode={state.orderMode!}
              phone={state.phone}
              onPhoneChange={handlePhoneChange}
              name={state.name}
              onNameChange={(n) => setState((prev) => ({ ...prev, name: n }))}
              cedula={state.cedula}
              onCedulaChange={(c) => setState((prev) => ({ ...prev, cedula: c }))}
              address={state.address}
              onAddressChange={(a) => setState((prev) => ({ ...prev, address: a }))}
              gpsCoords={state.gpsCoords}
              onGpsCoordsChange={(g) => setState((prev) => ({ ...prev, gpsCoords: g }))}
              isReturning={state.isReturning}
              phoneValid={phoneValid}
              customerFieldsVisible={state.customerFieldsVisible}
              isSubmitting={state.submitting}
              deliveryCoverage={initialSettings.deliveryCoverage}
              step2Ready={step2Ready}
              onContinue={goNext}
            />
          </>
        )}

        {/* Step 3 — Payment method */}
        {state.step === 3 && (
          <>
            <div className="mb-6">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                MÉTODO DE PAGO
              </p>
              <h1 className="font-display text-3xl font-bold text-text-main leading-tight">
                ¿Cómo <em className="not-italic text-primary">pagas</em>?
              </h1>
            </div>

            <PaymentMethodSelector
              paymentPagoMovilEnabled={initialSettings.paymentPagoMovilEnabled !== false}
              paymentTransferEnabled={initialSettings.paymentTransferEnabled !== false}
              paymentEfectivoEnabled={initialSettings.paymentEfectivoEnabled === true}
              paymentZelleEnabled={initialSettings.paymentZelleEnabled === true}
              paymentBinanceEnabled={initialSettings.paymentBinanceEnabled === true}
              paymentMethod={state.payment}
              onSetPaymentMethod={(m) => setState((prev) => ({ ...prev, payment: m }))}
              grandTotalUsdCents={grandTotalUsdCents}
              cashAmountUsd={state.cashAmountUsd}
              onCashAmountUsdChange={(v) => setState((prev) => ({ ...prev, cashAmountUsd: v }))}
              acceptChangeBs={state.acceptChangeBs}
              onAcceptChangeBsChange={(v) => setState((prev) => ({ ...prev, acceptChangeBs: v }))}
              efectivoAskCashAmount={initialSettings.efectivoAskCashAmount !== false}
              efectivoAskChangeBs={initialSettings.efectivoAskChangeBs !== false}
            />
          </>
        )}

        {/* Step 4 — Bank details + OTP/comprobante */}
        {state.step === 4 && state.initResult && state.orderId && (
          <>
            <div className="mb-5">
              <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-text-muted mb-1">
                REALIZA EL PAGO
              </p>
              <h1 className="font-display text-3xl font-bold text-text-main leading-tight">
                Datos <em className="not-italic text-primary">bancarios</em>
              </h1>
            </div>

            <Step4BankDetails
              orderId={state.orderId}
              checkoutToken={checkoutToken ?? ""}
              expiresAt={state.expiresAt}
              initResult={state.initResult}
              grandTotalBsCents={grandTotalBsCents}
              grandTotalUsdCents={grandTotalUsdCents}
              onConfirmed={handlePaid}
              onExpired={() => {
                clearPersistedCheckout();
                router.push("/checkout/expired");
              }}
              onError={(msg) => setState((prev) => ({ ...prev, error: msg }))}
              onFallbackWhatsApp={handleFallbackWhatsApp}
              paymentMethod={state.payment}
              cashAmountUsd={state.cashAmountUsd || null}
              acceptChangeBs={state.acceptChangeBs}
              activeProviderId={initialSettings.activePaymentProvider}
              fallbackBankDetails={{
                bankName: initialSettings.bankName,
                bankCode: initialSettings.bankCode,
                accountPhone: initialSettings.accountPhone,
                accountRif: initialSettings.accountRif,
                transferBankName: initialSettings.transferBankName,
                transferAccountName: initialSettings.transferAccountName,
                transferAccountNumber: initialSettings.transferAccountNumber,
                transferAccountRif: initialSettings.transferAccountRif,
                zelleEmail: initialSettings.zelleEmail,
                zelleName: initialSettings.zelleName,
                binanceEmail: initialSettings.binanceEmail,
                binancePayId: initialSettings.binancePayId,
              }}
            />
          </>
        )}

        {/* Step 5 — Success + tracker */}
        {state.step === 5 && state.initResult && state.orderId && (
          <Step5Success
            orderId={state.orderId}
            initResult={state.initResult}
            orderMode={state.orderMode}
            onNewOrder={handleNewOrder}
            onPaid={handlePaid}
          />
        )}
      </div>

      {/* ── STICKY CTA (steps 1-3) ── */}
      {state.step === 1 && !isKeyboardOpen && (
        <StickyCta
          label="Continuar →"
          onClick={goNext}
          disabled={state.orderMode === null}
          showTotal
          grandTotalUsdCents={grandTotalUsdCents}
          grandTotalBsCents={grandTotalBsCents}
        />
      )}

      {state.step === 2 && !isKeyboardOpen && (
        <StickyCta
          label="Continuar al pago →"
          onClick={goNext}
          disabled={!step2Ready}
          showTotal
          grandTotalUsdCents={grandTotalUsdCents}
          grandTotalBsCents={grandTotalBsCents}
        />
      )}

      {state.step === 3 && !isKeyboardOpen && (
        <StickyCta
          label="Ver instrucciones de pago →"
          onClick={handleSubmitOrder}
          disabled={!step3Ready}
          loading={state.submitting}
          loadingLabel="Procesando..."
          showTotal
          grandTotalUsdCents={grandTotalUsdCents}
          grandTotalBsCents={grandTotalBsCents}
        />
      )}

      {/* Step 4: CTA only for waiting_auto */}
      {state.step === 4 && state.initResult?.screen === "waiting_auto" && (
        <StickyCta
          label="Ya realicé el pago →"
          onClick={() => setState((prev) => ({ ...prev, step: 5 }))}
          showTotal={false}
        />
      )}
    </div>
  );
}
