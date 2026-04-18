import { useEffect, useRef } from "react";
import { Smartphone, Landmark, CheckCircle2, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "./CheckoutForm.types";

interface PaymentMethodSelectorProps {
  paymentPagoMovilEnabled: boolean;
  paymentTransferEnabled: boolean;
  paymentMethod: PaymentMethod;
  onSetPaymentMethod: (method: PaymentMethod) => void;
  phone: string;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  getFormattedPhone: () => string;
  phoneValid: boolean;
  customerFieldsVisible: boolean;
  isReturning: boolean;
  name: string;
  onNameChange: (name: string) => void;
  cedula: string;
  onCedulaChange: (cedula: string) => void;
  isSubmitting: boolean;
}

export function PaymentMethodSelector({
  paymentPagoMovilEnabled,
  paymentTransferEnabled,
  paymentMethod,
  onSetPaymentMethod,
  phone,
  onPhoneChange,
  getFormattedPhone,
  phoneValid,
  customerFieldsVisible,
  isReturning,
  name,
  onNameChange,
  cedula,
  onCedulaChange,
  isSubmitting,
}: PaymentMethodSelectorProps) {
  const customerFieldsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ✅ Auto-scroll when customer fields appear
  useEffect(() => {
    if (customerFieldsVisible && customerFieldsRef.current) {
      const timer = setTimeout(() => {
        customerFieldsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        nameInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [customerFieldsVisible]);

  return (
    <div className="bg-bg-card rounded-[20px] p-5 border border-border shadow-sm space-y-6">
      {/* Header */}
      <div className="text-[11px] font-display font-black tracking-[0.1em] text-text-muted uppercase flex items-center gap-2 opacity-80">
        <span className="w-4 h-[1px] bg-border" />
        Método de pago
      </div>

      {/* Payment Options (M4) */}
      <div className="grid gap-3">
        {paymentPagoMovilEnabled && (
          <button
            type="button"
            onClick={() => onSetPaymentMethod("pago_movil")}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-[18px] border-[1.5px] transition-all duration-300 text-left",
              paymentMethod === "pago_movil" 
                ? "bg-[#FAF5F2] border-[#7B2D2D] shadow-md" 
                : "bg-surface-section border-transparent hover:bg-border/10"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
              paymentMethod === "pago_movil" ? "bg-[#7B2D2D] text-white shadow-lg shadow-[#7B2D2D]/20 scale-105" : "bg-bg-card text-text-muted"
            )}>
              <Smartphone className="w-6 h-6" strokeWidth={paymentMethod === "pago_movil" ? 2.5 : 2} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[clamp(12px,4vw,14px)] font-display font-black tracking-tight",
                  paymentMethod === "pago_movil" ? "text-[#7B2D2D]" : "text-text-main"
                )}>
                  Pago Móvil
                </span>
                {paymentTransferEnabled && (
                  <span className="text-[9px] bg-[#2A7A4A] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    RECOMENDADO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted font-medium mt-0.5">Transferencia inmediata 24/7</p>
            </div>

            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              paymentMethod === "pago_movil" ? "border-[#7B2D2D] bg-[#7B2D2D]" : "border-border"
            )}>
              {paymentMethod === "pago_movil" && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={4} />}
            </div>
          </button>
        )}

        {paymentTransferEnabled && (
          <button
            type="button"
            onClick={() => onSetPaymentMethod("transfer")}
            className={cn(
              "relative flex items-center gap-4 p-4 rounded-[18px] border-[1.5px] transition-all duration-300 text-left",
              paymentMethod === "transfer" 
                ? "bg-[#FAF5F2] border-[#7B2D2D] shadow-md" 
                : "bg-surface-section border-transparent hover:bg-border/10"
            )}
          >
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
              paymentMethod === "transfer" ? "bg-[#7B2D2D] text-white shadow-lg shadow-[#7B2D2D]/20 scale-105" : "bg-bg-card text-text-muted"
            )}>
              <Landmark className="w-6 h-6" strokeWidth={paymentMethod === "transfer" ? 2.5 : 2} />
            </div>
            
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-[clamp(12px,4vw,14px)] font-display font-black tracking-tight",
                paymentMethod === "transfer" ? "text-[#7B2D2D]" : "text-text-main"
              )}>
                Transferencia
              </span>
              <p className="text-[11px] text-text-muted font-medium mt-0.5">Cuentas nacionales</p>
            </div>

            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              paymentMethod === "transfer" ? "border-[#7B2D2D] bg-[#7B2D2D]" : "border-border"
            )}>
              {paymentMethod === "transfer" && <CheckCircle2 className="w-3 h-3 text-white" strokeWidth={4} />}
            </div>
          </button>
        )}
      </div>

      {/* Phone Integration (M3) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <label className="text-[12px] font-display font-black text-text-main tracking-tight uppercase opacity-80">
            Tu número celular
          </label>
          {phone.length > 0 && phone.length < 11 && (
            <span className="text-[10px] font-black text-[#7B2D2D] flex items-center gap-1 animate-pulse">
              <Search className="w-3 h-3" /> TE BUSCAREMOS...
            </span>
          )}
          {phoneValid && !isReturning && (
            <span className="text-[10px] font-black text-[#2A7A4A] flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> NÚMERO VÁLIDO
            </span>
          )}
        </div>

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <span className="text-[14px] sm:text-[16px]">🇻🇪</span>
            <div className="w-[1px] h-4 bg-border/60" />
          </div>
          
          <input
            id="phone-input"
            type="tel"
            inputMode="numeric"
            value={getFormattedPhone()}
            onChange={onPhoneChange}
            placeholder="Ej: 0414 123 4567"
            maxLength={14}
            disabled={isSubmitting}
            className={cn(
              "w-full h-[54px] rounded-2xl border-2 bg-surface-section pl-[50px] pr-4 outline-none text-[15px] font-sans font-bold text-text-main transition-all shadow-inner",
              phone.length > 0 && !phoneValid 
                ? "border-[#bb0005]/20 focus:border-[#bb0005] focus:bg-white" 
                : "border-transparent focus:border-[#7B2D2D]/30 focus:bg-white focus:shadow-md"
            )}
          />
        </div>

        {/* Customer Data (M3/M6) */}
        <div
          ref={customerFieldsRef}
          className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            customerFieldsVisible ? "max-h-[400px] opacity-100 mt-6 pt-6 border-t border-dashed border-border" : "max-h-0 opacity-0 mt-0"
          )}
        >
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-500">
            {isReturning ? (
              <div className="bg-[#2A7A4A]/5 border border-[#2A7A4A]/20 p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#2A7A4A] text-white flex items-center justify-center shadow-lg shadow-[#2A7A4A]/20">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-display font-black text-[#2A7A4A]">¡Te encontramos!</h4>
                  <p className="text-[11px] text-[#2A7A4A]/70 font-bold uppercase tracking-wide mt-0.5">Bienvenido de nuevo, {name.split(' ')[0]}</p>
                </div>
              </div>
            ) : (
              <div className="bg-[#FAF5F2] border border-border p-4 rounded-2xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-border text-text-muted flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-[13px] font-display font-black text-text-main">Nuevo cliente</h4>
                  <p className="text-[11px] text-text-muted font-bold uppercase tracking-wide mt-0.5">Completa tus datos</p>
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-display font-black text-text-muted uppercase tracking-widest px-1">
                  Nombre completo
                </label>
                <input
                  id="name-input"
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Ej: Carlos Perez"
                  className="w-full h-12 rounded-xl border border-border bg-white px-4 text-[14px] font-bold text-text-main focus:border-[#7B2D2D] outline-none transition-all shadow-sm"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-display font-black text-text-muted uppercase tracking-widest px-1">
                  Cédula de Identidad
                </label>
                <input
                  id="cedula-input"
                  type="text"
                  value={cedula}
                  onChange={(e) => onCedulaChange(e.target.value)}
                  placeholder="Ej: 12345678"
                  className="w-full h-12 rounded-xl border border-border bg-white px-4 text-[14px] font-bold text-text-main focus:border-[#7B2D2D] outline-none transition-all shadow-sm"
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}