"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { User, MapPin, Loader2, CheckCircle2, AlertCircle, Home, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderMode, GpsCoords } from "./CheckoutForm.types";
import { useKeyboardOpen } from "@/hooks/useKeyboardOpen";

interface Step2CustomerDataProps {
  orderMode: OrderMode;
  phone: string;
  onPhoneChange: (val: string) => void;
  name: string;
  onNameChange: (val: string) => void;
  cedula: string;
  onCedulaChange: (val: string) => void;
  address: string;
  onAddressChange: (val: string) => void;
  gpsCoords: GpsCoords | null;
  onGpsCoordsChange: (coords: GpsCoords | null) => void;
  isReturning: boolean;
  phoneValid: boolean;
  customerFieldsVisible: boolean;
  isSubmitting: boolean;
  deliveryCoverage?: string | null;
  step2Ready?: boolean;
  onContinue?: () => void;
}

const ORDER_MODE_LABELS: Record<OrderMode, string> = {
  on_site: "En sitio",
  take_away: "Para llevar",
  delivery: "Delivery",
};

function validatePhone(value: string): boolean {
  return /^(0414|0424|0422|0412|0416|0426)\d{7}$/.test(value);
}

function formatPhone(raw: string): string {
  if (raw.length > 7) return `${raw.slice(0, 4)} ${raw.slice(4, 7)} ${raw.slice(7)}`;
  if (raw.length > 4) return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  return raw;
}

export function CheckoutForm({
  orderMode,
  phone,
  onPhoneChange,
  name,
  onNameChange,
  cedula,
  onCedulaChange,
  address,
  onAddressChange,
  gpsCoords,
  onGpsCoordsChange,
  isReturning,
  phoneValid,
  customerFieldsVisible,
  isSubmitting,
  deliveryCoverage,
  step2Ready,
  onContinue,
}: Step2CustomerDataProps) {
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isAddressFocused, setIsAddressFocused] = useState(false);

  const { isKeyboardOpen, keyboardHeight } = useKeyboardOpen();

  const nameInputRef = useRef<HTMLInputElement>(null);
  const cedulaInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  const hasAutoFocused = useRef(false);
  const hasAddressFocused = useRef(false);

  useEffect(() => {
    // Si se hacen visibles los campos personales (Bloque 2)
    // y el cliente no es recurrente (isReturning === false) y no se ha enfocado antes, enfocamos Nombre
    if (customerFieldsVisible && !isReturning && !name && !hasAutoFocused.current) {
      const timer = setTimeout(() => {
        if (nameInputRef.current) {
          nameInputRef.current.focus();
          nameInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          hasAutoFocused.current = true;
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [customerFieldsVisible, isReturning, name]);

  const isDeliveryBlockVisible = orderMode === "delivery" && name.trim().length >= 2 && cedula.trim().length >= 4;

  useEffect(() => {
    // Si se hace visible el bloque de Dirección (Bloque 3), el cliente es recurrente,
    // pero el campo de dirección está vacío, enfocamos la Dirección
    if (isDeliveryBlockVisible && isReturning && !address && !hasAddressFocused.current) {
      const timer = setTimeout(() => {
        if (addressInputRef.current) {
          addressInputRef.current.focus();
          addressInputRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
          hasAddressFocused.current = true;
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isDeliveryBlockVisible, isReturning, address]);

  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
    onPhoneChange(raw);
    if (raw.length === 11 && !validatePhone(raw)) {
      setPhoneError("Número venezolano inválido (0414, 0424, 0412, 0416, 0426)");
    } else {
      setPhoneError(null);
    }
  };

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: GpsCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        onGpsCoordsChange(coords);

        try {
          const { reverseGeocodeAction } = await import("@/actions/geocoding");
          const result = await reverseGeocodeAction(coords.lat, coords.lng);
          if (result.success && result.address) {
            onAddressChange(result.address);
          }
        } catch {
          onAddressChange(
            `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${Math.round(coords.accuracy)}m)`
          );
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        setIsGeolocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso denegado. Escribe tu dirección manualmente."
            : "No se pudo obtener ubicación."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [onGpsCoordsChange, onAddressChange]);

  return (
    <div
      className="flex flex-col gap-4"
      style={{
        paddingBottom: `calc(${isKeyboardOpen ? keyboardHeight : 0}px + env(safe-area-inset-bottom))`
      }}
    >
      {/* Phone field */}
      <div>
        <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 block mb-1.5">
          Número de WhatsApp
        </label>
        <div
          className={cn(
            "flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] border transition-colors",
            phoneError
              ? "border-primary bg-bg-card"
              : phoneValid
                ? "border-[#3F6B4A] bg-bg-card"
                : "border-border bg-bg-card"
          )}
        >
          <span className="text-[15px] shrink-0">🇻🇪</span>
          <span className="font-sans text-[14px] font-semibold text-text-muted shrink-0">+58</span>
          <div className="w-px h-4 bg-border shrink-0" />
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={formatPhone(phone)}
            onChange={handlePhoneInput}
            placeholder="0414 123 4567"
            maxLength={14}
            disabled={isSubmitting}
            className="flex-1 bg-transparent outline-none font-sans text-[15px] font-semibold text-text-main placeholder:text-text-muted/40"
          />
          {phoneValid && (
            <CheckCircle2 className="w-4 h-4 text-[#3F6B4A] shrink-0" />
          )}
        </div>
        {phoneError ? (
          <p className="font-sans text-[11px] text-primary mt-1 pl-1">{phoneError}</p>
        ) : (
          !phoneValid && (
            <p className="font-sans text-[12px] text-text-muted/60 mt-1 pl-1">
              Debes ingresar los 11 dígitos de tu número de teléfono (ej. 0414 123 4567)
            </p>
          )
        )}
      </div>

      {/* Customer fields — visible once phone is valid */}
      {customerFieldsVisible && (
        <div className="flex flex-col gap-4 transition-all duration-150 animate-in fade-in slide-in-from-top-2">
          {/* Returning customer badge */}
          {isReturning && (
            <div className="flex items-center gap-3 p-3 rounded-[14px] bg-[#E8EFE3] border border-[rgba(63,107,74,0.25)]">
              <div className="w-8 h-8 rounded-full bg-[#3F6B4A] text-white flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-sans text-[12px] font-bold text-[#3F6B4A]">¡Te encontramos!</p>
                <p className="font-sans text-[11px] text-[#3F6B4A]/70">
                  Bienvenido de nuevo, {name.split(" ")[0]}
                </p>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 block mb-1.5">
              Nombre y apellido
            </label>
            <div
              className={cn(
                "flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] border transition-colors bg-bg-card",
                nameError ? "border-primary" : "border-border"
              )}
            >
              <User className="w-[18px] h-[18px] text-text-muted shrink-0" />
              <input
                ref={nameInputRef}
                type="text"
                enterKeyHint="next"
                value={name}
                onChange={(e) => {
                  onNameChange(e.target.value);
                  if (e.target.value.trim().length >= 2) setNameError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    cedulaInputRef.current?.focus();
                    cedulaInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                placeholder="Carlos Pérez"
                disabled={isSubmitting}
                className="flex-1 bg-transparent outline-none font-sans text-[15px] text-text-main placeholder:text-text-muted/40"
              />
            </div>
            {nameError && (
              <p className="font-sans text-[11px] text-primary mt-1 pl-1">{nameError}</p>
            )}
          </div>

          {/* Cédula */}
          <div>
            <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 block mb-1.5">
              Cédula de identidad
            </label>
            <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] border border-border bg-bg-card transition-colors">
              <IdCard className="w-[18px] h-[18px] text-text-muted shrink-0" />
              <input
                ref={cedulaInputRef}
                type="text"
                inputMode="numeric"
                enterKeyHint={isDeliveryBlockVisible ? "next" : "go"}
                value={cedula}
                onChange={(e) => onCedulaChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isDeliveryBlockVisible) {
                      e.preventDefault();
                      addressInputRef.current?.focus();
                      addressInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    } else if (step2Ready && onContinue) {
                      e.preventDefault();
                      onContinue();
                    }
                  }
                }}
                placeholder="12345678"
                disabled={isSubmitting}
                className="flex-1 bg-transparent outline-none font-sans text-[15px] text-text-main placeholder:text-text-muted/40"
              />
            </div>
          </div>

          {/* Delivery address (Bloque 3 - Ubicación) */}
          {isDeliveryBlockVisible && (
            <div className="flex flex-col gap-4 transition-all duration-150 animate-in fade-in slide-in-from-top-2">
              <div>
                <label className="font-sans text-[10px] uppercase tracking-[0.12em] text-text-muted pl-1 block mb-1.5">
                  Dirección de entrega
                </label>

                {deliveryCoverage && isAddressFocused && (
                  <div className="bg-amber-50/80 border border-amber-200/50 rounded-[12px] px-4 py-2.5 flex items-start gap-2.5 mb-2.5 animate-in fade-in duration-150">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-tight font-bold text-amber-900/70 uppercase tracking-wider">
                      {deliveryCoverage}
                    </p>
                  </div>
                )}

                {/* GPS button (Siempre visible dentro del Bloque 3) */}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGeolocating || isSubmitting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2.5 rounded-[14px] py-3 mb-2.5 text-[13px] font-sans font-semibold border transition-all duration-150",
                    gpsCoords
                      ? "bg-[#E8EFE3] border-[rgba(63,107,74,0.4)] text-[#3F6B4A]"
                      : "bg-bg-card border-border text-text-main"
                  )}
                >
                  {isGeolocating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Localizando...
                    </>
                  ) : gpsCoords ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> GPS activado
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 text-primary" /> Usar mi ubicación
                    </>
                  )}
                </button>

                {geoError && (
                  <p className="font-sans text-[11px] text-primary mb-2 pl-1">{geoError}</p>
                )}

                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] border border-border bg-bg-card">
                  <Home className="w-[18px] h-[18px] text-text-muted shrink-0" />
                  <input
                    ref={addressInputRef}
                    type="text"
                    enterKeyHint="go"
                    value={address}
                    onChange={(e) => onAddressChange(e.target.value)}
                    onFocus={() => setIsAddressFocused(true)}
                    onBlur={() => setIsAddressFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && step2Ready && onContinue) {
                        e.preventDefault();
                        onContinue();
                      }
                    }}
                    placeholder="Av. Principal, Edif. Torre, Piso 3..."
                    disabled={isSubmitting}
                    className="flex-1 bg-transparent outline-none font-sans text-[15px] text-text-main placeholder:text-text-muted/40"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botón contextual de continuar (visible cuando el teclado está abierto y los datos completos) */}
          {isKeyboardOpen && step2Ready && onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="w-full h-[52px] rounded-full bg-primary text-white font-sans font-semibold text-[15px] flex items-center justify-center gap-1.5 shadow-elevated animate-in fade-in duration-150 mt-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              Confirmar y continuar al pago →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
