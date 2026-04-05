"use client";

import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, ChevronLeft, MapPin, Store, Package } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutForm } from "@/hooks/useCheckoutForm";
import { useCheckoutSurcharges } from "@/hooks/useCheckoutSurcharges";
import { OrderModeSelector } from "./OrderModeSelector";
import { OrderSummary } from "./OrderSummary";
import { PaymentMethodSelector } from "./PaymentMethodSelector";
import { CheckoutStickyFooter } from "./CheckoutStickyFooter";
import type { CheckoutFormProps, OrderMode } from "./CheckoutForm.types";

const MODE_ICONS: Record<string, typeof Store> = {
  on_site: Store,
  take_away: Package,
  delivery: MapPin,
};

const MODE_LABELS: Record<string, string> = {
  on_site: "En sitio",
  take_away: "Para llevar",
  delivery: "Delivery",
};

const MODE_DESCRIPTIONS: Record<string, string> = {
  on_site: "Para comer en el local",
  take_away: "Retira en el local",
  delivery: "A domicilio",
};

export function CheckoutForm({
  items,
  totalBsCents,
  totalUsdCents,
  isSubmitting,
  error,
  onSubmit,
  settings,
}: CheckoutFormProps) {
  const router = useRouter();

  const form = useCheckoutForm({
    isSubmitting,
    onSubmit,
    settings,
  });

  // Compute surcharges with the actual selected orderMode from form
  const surchargesWithMode = useCheckoutSurcharges({
    items,
    orderMode: form.orderMode,
    settings,
    totalBsCents,
    totalUsdCents,
  });

  // Keep form's surcharges in sync for handleSubmit → clientSurcharges
  form.surchargesRef.current = surchargesWithMode.surcharges;

  // Build available modes
  const availableModes = [
    { id: "on_site" as OrderMode, label: MODE_LABELS.on_site, icon: MODE_ICONS.on_site, enabled: settings?.orderModeOnSiteEnabled !== false, description: MODE_DESCRIPTIONS.on_site },
    { id: "take_away" as OrderMode, label: MODE_LABELS.take_away, icon: MODE_ICONS.take_away, enabled: settings?.orderModeTakeAwayEnabled !== false, description: MODE_DESCRIPTIONS.take_away },
    { id: "delivery" as OrderMode, label: MODE_LABELS.delivery, icon: MODE_ICONS.delivery, enabled: settings?.orderModeDeliveryEnabled !== false, description: MODE_DESCRIPTIONS.delivery },
  ].filter((m) => m.enabled);

  return (
    <div className="flex flex-col h-full bg-[#F8EFE6]/30">
      {/* ─── CUSTOM TOP BAR ─── */}
      <div className="pt-5 px-5 pb-0">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 rounded-full bg-white/70 border border-black/10 flex items-center justify-center cursor-pointer active:bg-white"
          >
            <ChevronLeft className="w-[14px] h-[14px] text-[#3C1A1A]" strokeWidth={2.5} />
          </button>
          <span className="text-[20px] font-medium text-[#1A0A0A]">Checkout</span>
          <div className="ml-auto flex items-center gap-[5px]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4A9A0]" />
            <div className="w-[18px] h-1.5 rounded-[3px] bg-[#7B2D2D]" />
          </div>
        </div>
      </div>

      <div className="px-3 pb-32">
        {error && (
          <div className="bg-[#A03030]/10 border border-[#A03030]/20 text-[#A03030] text-[13px] p-3 rounded-xl mb-4 animate-in fade-in">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <OrderModeSelector
            availableModes={availableModes}
            orderMode={form.orderMode}
            onSetOrderMode={form.setOrderMode}
            deliveryAddress={form.deliveryAddress}
            onSetDeliveryAddress={form.setDeliveryAddress}
            settings={settings}
            isSubmitting={isSubmitting}
            surcharges={surchargesWithMode.surcharges}
          />

          <OrderSummary
            items={items}
            itemCount={surchargesWithMode.itemCount}
            summaryExpanded={form.summaryExpanded}
            onToggleSummary={() => form.setSummaryExpanded((v) => !v)}
            totalBsCents={totalBsCents}
            totalUsdCents={totalUsdCents}
            surcharges={surchargesWithMode.surcharges}
            rate={surchargesWithMode.rate}
            grandTotalBsCents={surchargesWithMode.grandTotalBsCents}
            grandTotalUsdCents={surchargesWithMode.grandTotalUsdCents}
            settings={settings}
          />

          <PaymentMethodSelector
            paymentPagoMovilEnabled={settings?.paymentPagoMovilEnabled !== false}
            paymentTransferEnabled={settings?.paymentTransferEnabled !== false}
            paymentMethod={form.paymentMethod}
            onSetPaymentMethod={form.setPaymentMethod}
            phone={form.phone}
            onPhoneChange={form.handlePhoneChange}
            getFormattedPhone={form.getFormattedPhone}
            phoneValid={form.phoneValid}
            customerFieldsVisible={form.customerFieldsVisible}
            isReturning={form.isReturning}
            name={form.name}
            onNameChange={form.setName}
            cedula={form.cedula}
            onCedulaChange={form.setCedula}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      <CheckoutStickyFooter
        onSubmit={form.handleSubmit}
        isSubmitting={isSubmitting}
        phoneValid={form.phoneValid}
        grandTotalBsCents={surchargesWithMode.grandTotalBsCents}
        orderModeSelected={form.orderModeSelected}
      />
    </div>
  );
}
