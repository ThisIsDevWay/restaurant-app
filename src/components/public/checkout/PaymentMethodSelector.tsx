"use client";

import { Smartphone, Landmark } from "lucide-react";
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
  return (
    <div className="bg-white rounded-[16px] p-4 border border-black/[0.06]">
      <div className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase mb-3">
        Método de pago
      </div>

      {paymentPagoMovilEnabled && (
        <div
          onClick={() => onSetPaymentMethod("pago_movil")}
          className={`rounded-xl p-3.5 border-[1.5px] cursor-pointer transition-all mb-2 flex items-center gap-3 ${paymentMethod === "pago_movil" ? "bg-[#FBF0EC] border-[#7B2D2D]" : "bg-[#FAF5F2] border-transparent"}`}
        >
          <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors ${paymentMethod === "pago_movil" ? "bg-[#7B2D2D] text-white" : "bg-[#E8DED8] text-[#7B5050]"}`}>
            <Smartphone className="w-[18px] h-[18px]" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-[14px] font-medium text-[#1A0A0A]">Pago Móvil</div>
            <div className="text-[11px] text-[#9A6A5A] mt-[1px]">Transferencia inmediata</div>
            {paymentTransferEnabled && (
              <div className="bg-[#EADDD8] text-[#7B2D2D] text-[10px] font-medium px-[7px] py-[2px] rounded-full inline-block mt-[3px]">Recomendado</div>
            )}
          </div>
          <div className={`w-[18px] h-[18px] rounded-full border-[1.5px] ml-auto flex-shrink-0 flex items-center justify-center transition-colors ${paymentMethod === "pago_movil" ? "border-[#7B2D2D]" : "border-[#D4A9A0]"}`}>
            {paymentMethod === "pago_movil" && <div className="w-2 h-2 rounded-full bg-[#7B2D2D]"></div>}
          </div>
        </div>
      )}

      {paymentTransferEnabled && (
        <div
          onClick={() => onSetPaymentMethod("transfer")}
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

      <div className="mt-4 animate-in fade-in slide-in-from-top-1 duration-200">
        <div>
          <div className="text-[12px] font-medium text-[#3C1A1A] mb-2">
            Tu número para Pago Móvil / Contacto
          </div>
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
              onChange={onPhoneChange}
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

        {customerFieldsVisible && (
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
                onChange={(e) => onNameChange(e.target.value)}
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
                onChange={(e) => onCedulaChange(e.target.value)}
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
  );
}
