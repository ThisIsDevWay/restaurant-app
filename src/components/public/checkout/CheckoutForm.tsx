"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { formatBs, formatRef } from "@/lib/money";
import { Loader2, ChevronDown, ChevronLeft, MapPin, Store, Package, Smartphone, Landmark, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/store/cartStore";

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
}

interface CheckoutFormProps {
  items: CartItem[];
  totalBsCents: number;
  totalUsdCents: number;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (phone: string, paymentMethod: "pago_movil" | "transfer", name?: string, cedula?: string, orderMode?: "on_site" | "take_away" | "delivery", deliveryAddress?: string) => void;
  settings: CheckoutSettings | null;
}

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
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [cedula, setCedula] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"pago_movil" | "transfer">(
    settings?.paymentPagoMovilEnabled !== false ? "pago_movil" : "transfer"
  );
  const [orderMode, setOrderMode] = useState<"on_site" | "take_away" | "delivery" | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [envasesExpanded, setEnvasesExpanded] = useState(false);
  const [customerFieldsVisible, setCustomerFieldsVisible] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  // --- Surcharge calculation ---
  const surcharges = useMemo(() => {
    if (!settings || !orderMode || orderMode === "on_site") {
      return { plateCount: 0, adicionalCount: 0, bebidaCount: 0, packagingUsdCents: 0, deliveryUsdCents: 0, totalSurchargeUsdCents: 0 };
    }

    let plateCount = 0;
    let adicionalCount = 0;
    let bebidaCount = 0;

    items.forEach((item) => {
      plateCount += item.quantity;
      adicionalCount += item.selectedAdicionales.length * item.quantity;
      bebidaCount += (item.selectedBebidas ?? []).length * item.quantity;
    });

    const packagingUsdCents =
      plateCount * settings.packagingFeePerPlateUsdCents +
      adicionalCount * settings.packagingFeePerAdicionalUsdCents +
      bebidaCount * settings.packagingFeePerBebidaUsdCents;

    const deliveryUsdCents = orderMode === "delivery" ? settings.deliveryFeeUsdCents : 0;

    return {
      plateCount,
      adicionalCount,
      bebidaCount,
      packagingUsdCents,
      deliveryUsdCents,
      totalSurchargeUsdCents: packagingUsdCents + deliveryUsdCents,
    };
  }, [items, orderMode, settings]);

  // Convert surcharge from USD cents to Bs cents using the live exchange rate
  const rate = settings?.rate ?? 0;
  const grandTotalSurchargeBsCents = rate > 0
    ? Math.round(surcharges.totalSurchargeUsdCents * rate)
    : 0;
  const grandTotalBsCents = totalBsCents + grandTotalSurchargeBsCents;
  const grandTotalUsdCents = totalUsdCents + surcharges.totalSurchargeUsdCents;

  // --- Available modes ---
  const availableModes = useMemo(() => {
    const modes: Array<{ value: "on_site" | "take_away" | "delivery"; label: string; icon: typeof Store; desc: string }> = [];
    if (settings?.orderModeOnSiteEnabled !== false) modes.push({ value: "on_site", label: "En sitio", icon: Store, desc: "Comer aquí" });
    if (settings?.orderModeTakeAwayEnabled !== false) modes.push({ value: "take_away", label: "Para llevar", icon: Package, desc: "Retiro en local" });
    if (settings?.orderModeDeliveryEnabled !== false) modes.push({ value: "delivery", label: "Delivery", icon: MapPin, desc: "Envío a domicilio" });
    return modes;
  }, [settings]);

  // Set default mode on mount if available
  useEffect(() => {
    if (!orderMode && availableModes.length > 0) {
      setOrderMode(availableModes[availableModes.length - 1].value); // Default to take_away or delivery usually
    }
  }, []);

  const validatePhone = (value: string) => {
    if (!/^(0414|0424|0412|0416|0426)\d{7}$/.test(value)) {
      return "Número de teléfono venezolano inválido";
    }
    return null;
  };

  const lookupCustomer = useCallback(async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phoneNumber}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.found) {
        setName(data.name ?? "");
        setCedula(data.cedula ?? "");
        setIsReturning(true);
      } else {
        setName("");
        setCedula("");
        setIsReturning(false);
      }
      setCustomerFieldsVisible(true);
    } catch {
      setCustomerFieldsVisible(true);
    }
  }, []);

  // Format phone automatically like 0414 123 4567
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 11) val = val.slice(0, 11);
    setPhone(val);
  };

  const getFormattedPhone = () => {
    if (phone.length > 7) return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    if (phone.length > 4) return `${phone.slice(0, 4)} ${phone.slice(4)}`;
    return phone;
  };

  useEffect(() => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);

    if (phone.length === 11 && validatePhone(phone) === null) {
      lookupTimeout.current = setTimeout(() => lookupCustomer(phone), 400);
    } else {
      setCustomerFieldsVisible(false);
      setIsReturning(false);
      setName("");
      setCedula("");
    }

    return () => {
      if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    };
  }, [phone, lookupCustomer]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const err = validatePhone(phone);
    if (err) {
      document.getElementById('phone-input')?.focus();
      return;
    }
    onSubmit(
      phone,
      paymentMethod,
      name.trim() || undefined,
      cedula.trim() || undefined,
      orderMode ?? undefined,
      deliveryAddress.trim() || undefined,
    );
  };

  const phoneValid = phone.length === 11 && validatePhone(phone) === null;

  return (
    <div className="flex flex-col h-full">
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

      <div className="px-3 pb-4">
        {/* ─── 1. ORDER MODE ─── */}
        <div className="bg-white rounded-[16px] mb-2.5 p-4 border border-black/[0.06]">
          <div className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase mb-3">
            ¿Cómo prefieres tu pedido?
          </div>

          <div className={`grid gap-2 ${availableModes.length === 3 ? "grid-cols-3" : availableModes.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
            {availableModes.map(({ value, label, icon: Icon, desc }) => {
              const selected = orderMode === value;
              return (
                <div
                  key={value}
                  onClick={() => setOrderMode(value)}
                  className={`rounded-xl p-3 border-[1.5px] cursor-pointer transition-all ${selected ? "bg-[#FBF0EC] border-[#7B2D2D]" : "bg-[#FAF5F2] border-transparent"}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 transition-colors ${selected ? "bg-[#7B2D2D] text-white" : "bg-[#E8DED8] text-[#7B5050]"}`}>
                    <Icon className="w-[15px] h-[15px]" strokeWidth={2} />
                  </div>
                  <div className="text-[13px] font-medium text-[#1A0A0A]">{label}</div>
                  <div className="text-[11px] text-[#9A6A5A] mt-[1px]">{desc}</div>

                  {value === "delivery" && surcharges.deliveryUsdCents > 0 && selected && (
                    <div className="text-[11px] text-[#7B2D2D] mt-1.5 animate-in fade-in zoom-in-95 duration-200">
                      + {formatRef(surcharges.deliveryUsdCents)} envío
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {orderMode === "delivery" && (
            <div className="mt-2.5 bg-[#FBF0EC] rounded-[10px] p-2.5 border-[0.5px] border-[#E8C8B8] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="text-[11px] font-medium text-[#7B2D2D] mb-1.5 flex items-center gap-1.5">
                Dirección de entrega
                {settings?.deliveryCoverage && (
                  <span className="font-normal opacity-70">({settings.deliveryCoverage})</span>
                )}
              </div>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Av. Principal, Edif. Torre, Piso 3..."
                className="w-full bg-transparent border-none outline-none text-[13px] text-[#3C1A1A] font-sans placeholder:text-[#C4A090]"
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        {/* ─── 2. ORDER SUMMARY ─── */}
        <div className="bg-white rounded-[16px] mb-2.5 p-4 border border-black/[0.06]">
          <div
            onClick={() => setSummaryExpanded((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="bg-[#7B2D2D] text-white text-[11px] font-medium rounded-full px-2 py-[2px]">
                {itemCount} {itemCount === 1 ? "plato" : "platos"}
              </span>
              <span className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase m-0">
                Resumen del pedido
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] text-[#3C1A1A] font-medium">
                {formatBs(grandTotalBsCents)}
              </span>
              <div className={`transition-transform duration-200 flex ${summaryExpanded ? "rotate-180" : ""}`}>
                <ChevronDown className="w-3.5 h-3.5 text-[#7B2D2D]" strokeWidth={1.8} />
              </div>
            </div>
          </div>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${summaryExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="h-[0.5px] bg-black/[0.07] my-3"></div>

            {items.map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-[14px] font-medium text-[#1A0A0A]">
                      {item.quantity > 1 ? `${item.quantity}× ` : ""}{item.name}
                    </div>
                    <div className="text-[12px] text-[#9A6A5A] mt-0.5">
                      Base · {formatBs(item.baseBsCents)} / {formatRef(item.baseUsdCents)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[14px] font-medium text-[#1A0A0A]">
                      {formatBs(item.itemTotalBsCents * item.quantity)}
                    </div>
                    <div className="text-[11px] text-[#9A6A5A]">
                      {formatRef(Math.round((item.itemTotalBsCents * item.quantity) / (totalBsCents / totalUsdCents)))}
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-col gap-[5px]">
                  {/* Contornos */}
                  {((item.fixedContornos ?? []).length > 0 || (item.contornoSubstitutions ?? []).length > 0) && (
                    <>
                      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Contornos</div>
                      {(item.fixedContornos ?? []).map((c) => (
                        <div key={c.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                          <span className="text-[12px] text-[#5A3A3A]">{c.name}</span>
                          <span className="text-[11px] italic text-[#9A6A5A]">incluido</span>
                        </div>
                      ))}
                      {(item.contornoSubstitutions ?? []).map((s, idx2) => (
                        <div key={idx2} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                          <span className="text-[12px] text-[#5A3A3A]">
                            {s.substituteName} <span className="opacity-70 text-[11px] ml-1">(en lugar de {s.originalName})</span>
                          </span>
                          {s.priceBsCents > 0 ? (
                            <span className="text-[12px] font-medium text-[#7B2D2D]">+ {formatBs(s.priceBsCents)}</span>
                          ) : (
                            <span className="text-[11px] italic text-[#9A6A5A]">incluido</span>
                          )}
                        </div>
                      ))}
                    </>
                  )}

                  {/* Sin (Removidos) */}
                  {(item.removedComponents ?? []).length > 0 && (
                    <>
                      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Removido</div>
                      {(item.removedComponents ?? []).map((r) => (
                        <div key={r.componentId} className="flex justify-between items-center pl-2 border-l-[1.5px] border-red-200">
                          <span className="text-[12px] italic text-red-800/70">Sin {r.name}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Adicionales */}
                  {item.selectedAdicionales.length > 0 && (
                    <>
                      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Adicionales</div>
                      {item.selectedAdicionales.map((adicional) => (
                        <div key={adicional.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                          <span className="text-[12px] text-[#5A3A3A]">{adicional.name}</span>
                          <span className="text-[12px] font-medium text-[#7B2D2D]">
                            {adicional.priceBsCents > 0 ? `+ ${formatBs(adicional.priceBsCents)}` : "incluido"}
                          </span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Bebidas */}
                  {(item.selectedBebidas ?? []).length > 0 && (
                    <>
                      <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-[#C4A090] mt-1.5 mb-[2px]">Bebidas</div>
                      {(item.selectedBebidas ?? []).map((bebida) => (
                        <div key={bebida.id} className="flex justify-between items-center pl-2 border-l-[1.5px] border-[#EDD8CF]">
                          <span className="text-[12px] text-[#5A3A3A]">{bebida.name}</span>
                          <span className="text-[12px] font-medium text-[#7B2D2D]">
                            {bebida.priceBsCents > 0 ? `+ ${formatBs(bebida.priceBsCents)}` : "incluido"}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                {idx !== items.length - 1 && <div className="h-[0.5px] bg-black/[0.07] my-3"></div>}
              </div>
            ))}

            <div className="h-[0.5px] bg-black/[0.07] my-3"></div>

            <div className="bg-[#FAF5F2] rounded-[10px] p-3 mt-3">
              <div className="flex justify-between text-[12px] text-[#6A4040] py-[3px]">
                <span>Subtotal platos</span>
                <span>{formatBs(totalBsCents)}</span>
              </div>

              {surcharges.totalSurchargeUsdCents > 0 && (
                <>
                  {surcharges.packagingUsdCents > 0 && (
                    <>
                      <span
                        className="text-[11px] text-[#7B2D2D] underline cursor-pointer mt-1.5 mb-1 inline-block"
                        onClick={() => setEnvasesExpanded(!envasesExpanded)}
                      >
                        + Cargos por envases ({rate > 0 ? formatBs(Math.round(surcharges.packagingUsdCents * rate)) : formatRef(surcharges.packagingUsdCents)}) {envasesExpanded ? '▴' : '▾'}
                      </span>
                      <div className={`overflow-hidden transition-all duration-200 ease-in-out ${envasesExpanded ? "max-h-[100px]" : "max-h-0"}`}>
                        <div className="mt-1">
                          {surcharges.plateCount > 0 && settings!.packagingFeePerPlateUsdCents > 0 && (
                            <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                              <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.plateCount}× plato</span>
                              <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerPlateUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerPlateUsdCents)}/u`}</span>
                            </div>
                          )}
                          {surcharges.adicionalCount > 0 && settings!.packagingFeePerAdicionalUsdCents > 0 && (
                            <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                              <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.adicionalCount}× adicional</span>
                              <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerAdicionalUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerAdicionalUsdCents)}/u`}</span>
                            </div>
                          )}
                          {surcharges.bebidaCount > 0 && settings!.packagingFeePerBebidaUsdCents > 0 && (
                            <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                              <span className="pl-2 relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-[1.5px] before:bg-[#EDD8CF]">{surcharges.bebidaCount}× bebida</span>
                              <span>{rate > 0 ? `${formatBs(Math.round(settings!.packagingFeePerBebidaUsdCents * rate))}/u` : `${formatRef(settings!.packagingFeePerBebidaUsdCents)}/u`}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {surcharges.deliveryUsdCents > 0 && (
                    <div className="flex justify-between text-[12px] text-[#6A4040] py-[3px]">
                      <span>Envío (Delivery)</span>
                      <span>{rate > 0 ? formatBs(Math.round(surcharges.deliveryUsdCents * rate)) : formatRef(surcharges.deliveryUsdCents)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="h-[0.5px] bg-black/[0.08] my-1.5"></div>
              <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                <span>Base imponible</span>
                <span>{formatBs(Math.round(grandTotalBsCents / 1.16))}</span>
              </div>
              <div className="flex justify-between text-[12px] text-[#8A5050] py-[3px]">
                <span>IVA incluido (16%)</span>
                <span>{formatBs(grandTotalBsCents - Math.round(grandTotalBsCents / 1.16))}</span>
              </div>
              <div className="h-[0.5px] bg-black/[0.08] my-1.5"></div>
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-[13px] font-medium text-[#1A0A0A]">Total a pagar</span>
                <div className="text-right">
                  <div className="text-[17px] font-medium text-[#7B2D2D]">{formatBs(grandTotalBsCents)}</div>
                  <div className="text-[12px] text-[#9A6A5A]">
                    {formatRef(grandTotalUsdCents)} · tasa BCV
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 3. PAYMENT METHOD ─── */}
        <div className="bg-white rounded-[16px] mb-2.5 p-4 border border-black/[0.06]">
          <div className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase mb-3">
            Método de pago
          </div>

          {settings?.paymentPagoMovilEnabled !== false && (
            <div
              onClick={() => setPaymentMethod("pago_movil")}
              className={`rounded-xl p-3.5 border-[1.5px] cursor-pointer transition-all mb-2 flex items-center gap-3 ${paymentMethod === "pago_movil" ? "bg-[#FBF0EC] border-[#7B2D2D]" : "bg-[#FAF5F2] border-transparent"}`}
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors ${paymentMethod === "pago_movil" ? "bg-[#7B2D2D] text-white" : "bg-[#E8DED8] text-[#7B5050]"}`}>
                <Smartphone className="w-[18px] h-[18px]" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#1A0A0A]">Pago Móvil</div>
                <div className="text-[11px] text-[#9A6A5A] mt-[1px]">Transferencia inmediata</div>
                {settings?.paymentTransferEnabled !== false && (
                  <div className="bg-[#EADDD8] text-[#7B2D2D] text-[10px] font-medium px-[7px] py-[2px] rounded-full inline-block mt-[3px]">Recomendado</div>
                )}
              </div>
              <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] ml-auto flex-shrink-0 flex items-center justify-center transition-colors ${paymentMethod === "pago_movil" ? "border-[#7B2D2D]" : "border-[#D4A9A0]"}`}>
                {paymentMethod === "pago_movil" && <div className="w-2 h-2 rounded-full bg-[#7B2D2D]"></div>}
              </div>
            </div>
          )}

          {settings?.paymentTransferEnabled !== false && (
            <div
              onClick={() => setPaymentMethod("transfer")}
              className={`rounded-xl p-3.5 border-[1.5px] cursor-pointer transition-all mb-2 flex items-center gap-3 ${paymentMethod === "transfer" ? "bg-[#FBF0EC] border-[#7B2D2D]" : "bg-[#FAF5F2] border-transparent"}`}
            >
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors ${paymentMethod === "transfer" ? "bg-[#7B2D2D] text-white" : "bg-[#E8DED8] text-[#7B5050]"}`}>
                <Landmark className="w-[18px] h-[18px]" strokeWidth={2.2} />
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#1A0A0A]">Transferencia</div>
                <div className="text-[11px] text-[#9A6A5A] mt-[1px]">Entre cuentas bancarias</div>
              </div>
              <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] ml-auto flex-shrink-0 flex items-center justify-center transition-colors ${paymentMethod === "transfer" ? "border-[#7B2D2D]" : "border-[#D4A9A0]"}`}>
                {paymentMethod === "transfer" && <div className="w-2 h-2 rounded-full bg-[#7B2D2D]"></div>}
              </div>
            </div>
          )}

          {/* ─── CONDITIONAL INFO (Phone or Bank) ─── */}
          <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {paymentMethod === "pago_movil" ? (
              <div>
                <div className="text-[12px] font-medium text-[#3C1A1A] mb-2">Tu número para Pago Móvil</div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[15px]">
                    <span>🇻🇪</span>
                    <span className="text-[13px] text-[#5A3A3A] font-medium">+58</span>
                    <div className="w-[0.5px] h-4 bg-black/15 mx-[2px]"></div>
                  </div>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="numeric"
                    value={getFormattedPhone()}
                    onChange={handlePhoneChange}
                    placeholder="0414 123 4567"
                    maxLength={14} // formatted length
                    disabled={isSubmitting}
                    className={`w-full h-11 rounded-[10px] border-[1.5px] bg-[#FAF5F2] text-[14px] text-[#1A0A0A] pl-[90px] pr-3 outline-none transition-colors focus:bg-[#FBF0EC] 
                      ${phone.length > 0 && !phoneValid ? "border-[#A03030]/50 focus:border-[#A03030]" : "border-[#E8DED8] focus:border-[#7B2D2D]"}`}
                  />
                </div>
                <div className={`text-[11px] mt-1.5 transition-colors ${phone.length === 0 ? "text-[#9A6A5A]" : phoneValid ? "text-[#2A7A4A] font-medium" : "text-[#A03030]"}`}>
                  {phone.length === 0 ? "11 dígitos · ej: 0414 123 4567" : phoneValid ? "Número válido ✓" : `${phone.length}/11 dígitos`}
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="bg-[#FAF5F2] rounded-[10px] p-3 border-[1.5px] border-[#E8DED8] flex items-start gap-2.5">
                  <Landmark className="w-4 h-4 text-[#9A6A5A] mt-[1px] flex-shrink-0" strokeWidth={1.8} />
                  <div>
                    <div className="text-[13px] text-[#3C1A1A] font-medium">Transferencia bancaria</div>
                    <div className="text-[11px] text-[#9A6A5A] mt-[2px]">Al confirmar tu pedido recibirás los datos de la cuenta.</div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer returning info (visible when phone fits or transfer is selected) */}
            {(customerFieldsVisible || paymentMethod === "transfer") && (
              <div className="mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
                {isReturning && (
                  <div className="text-[11px] text-[#2A7A4A] font-medium bg-[#2A7A4A]/5 px-2.5 py-1.5 rounded-md inline-block">
                    ¡Bienvenido de nuevo! 👋
                  </div>
                )}
                <div>
                  <label className="mb-[6px] block text-[12px] font-medium text-[#3C1A1A]">
                    ¿Cómo te llamamos? <span className="text-[#9A6A5A] font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Carlos Perez"
                    maxLength={50}
                    className="w-full h-11 rounded-[10px] border-[1.5px] border-[#E8DED8] bg-[#FAF5F2] focus:bg-[#FBF0EC] focus:border-[#7B2D2D] outline-none text-[14px] text-[#1A0A0A] px-3 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="mb-[6px] block text-[12px] font-medium text-[#3C1A1A]">
                    Cédula / Documento <span className="text-[#9A6A5A] font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: V-12345678"
                    maxLength={12}
                    className="w-full h-11 rounded-[10px] border-[1.5px] border-[#E8DED8] bg-[#FAF5F2] focus:bg-[#FBF0EC] focus:border-[#7B2D2D] outline-none text-[14px] text-[#1A0A0A] px-3 transition-colors"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-[#A03030]/10 border border-[#A03030]/20 text-[#A03030] text-[13px] p-3 rounded-xl mb-4 animate-in fade-in">
            {error}
          </div>
        )}
      </div>

      {/* ─── STICKY BOTTOM ─── */}
      <div className="sticky bottom-0 bg-[#F8EFE6] border-t-[0.5px] border-black/10 px-4 pt-3 pb-6 mt-auto">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || (paymentMethod === "pago_movil" && !phoneValid)}
          className="w-full h-[52px] bg-[#7B2D2D] hover:bg-[#6A2323] text-white rounded-[14px] font-medium flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </span>
          ) : (
            <>
              <span>Confirmar pedido</span>
              <span className="opacity-40">·</span>
              <span className="font-normal opacity-85 text-[14px]">{formatBs(grandTotalBsCents)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
