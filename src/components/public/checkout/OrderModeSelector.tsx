"use client";

import { useState, useCallback } from "react";
import { Store, Package, MapPin, Loader2, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { formatRef } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderMode, GpsCoords } from "./CheckoutForm.types";

interface OrderModeOption {
  id: OrderMode;
  label: string;
  icon: typeof Store;
  enabled: boolean;
  description: string;
}

interface OrderModeSelectorProps {
  availableModes: OrderModeOption[];
  orderMode: OrderMode | null;
  onSetOrderMode: (mode: OrderMode) => void;
  deliveryAddress: string;
  onSetDeliveryAddress: (address: string) => void;
  settings: { deliveryCoverage: string | null; deliveryFeeUsdCents?: number } | null;
  isSubmitting: boolean;
  surcharges: { deliveryUsdCents: number };
  gpsCoords: GpsCoords | null;
  onSetGpsCoords: (coords: GpsCoords | null) => void;
}

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

export function OrderModeSelector({
  availableModes,
  orderMode,
  onSetOrderMode,
  deliveryAddress,
  onSetDeliveryAddress,
  settings,
  isSubmitting,
  surcharges,
  gpsCoords,
  onSetGpsCoords,
}: OrderModeSelectorProps) {
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [usedGps, setUsedGps] = useState(false);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsGeolocating(true);
    setGeoError(null);
    setUsedGps(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: GpsCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        onSetGpsCoords(coords);

        try {
          const { reverseGeocodeAction } = await import("@/actions/geocoding");
          const result = await reverseGeocodeAction(coords.lat, coords.lng);

          if (result.success && result.address) {
            onSetDeliveryAddress(result.address);
            setUsedGps(true);
          } else {
            onSetDeliveryAddress(
              `Error: ${result.error || "No se encontró dirección"}. GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
            );
          }
        } catch {
          onSetDeliveryAddress(
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
  }, [onSetGpsCoords, onSetDeliveryAddress]);

  return (
    <div className="flex flex-col gap-2.5">
      {availableModes.map((mode) => {
        const Icon = MODE_ICONS[mode.id];
        const selected = orderMode === mode.id;
        const isDelivery = mode.id === "delivery";
        return (
          <div key={mode.id}>
            <button
              type="button"
              onClick={() => onSetOrderMode(mode.id)}
              disabled={isSubmitting}
              className={cn(
                "w-full flex items-center gap-3.5 p-4 rounded-[18px] border transition-all duration-200 text-left",
                selected
                  ? "bg-bg-card border-2 border-primary shadow-[0_8px_22px_rgba(187,0,5,0.12)]"
                  : "bg-bg-card border border-border shadow-card"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "w-[52px] h-[52px] rounded-[14px] flex items-center justify-center shrink-0 transition-colors duration-200",
                  selected ? "bg-primary text-white" : "bg-surface-section text-text-main"
                )}
              >
                <Icon className="w-6 h-6" strokeWidth={selected ? 2.5 : 2} />
              </div>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-[22px] leading-none text-text-main">
                  {MODE_LABELS[mode.id]}
                </p>
                <p className="font-sans text-[13px] text-text-muted mt-0.5">
                  {MODE_DESCRIPTIONS[mode.id]}
                </p>
                {isDelivery && surcharges.deliveryUsdCents > 0 && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-surface-section text-text-muted font-sans text-[10px] font-semibold">
                    +{formatRef(surcharges.deliveryUsdCents)}
                  </span>
                )}
              </div>

              {/* Radio */}
              <div
                className={cn(
                  "w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-200",
                  selected ? "bg-primary border-primary" : "border-border"
                )}
              >
                {selected && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Delivery address — only shown under delivery card */}
            {isDelivery && orderMode === "delivery" && (
              <div className="mt-2 px-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {settings?.deliveryCoverage && (
                  <div className="bg-amber-50/80 border border-amber-200/50 rounded-[12px] px-4 py-2.5 flex items-start gap-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-tight font-bold text-amber-900/70 uppercase tracking-wider">
                      {settings.deliveryCoverage}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={isGeolocating || isSubmitting}
                  className={cn(
                    "w-full flex items-center justify-center gap-2.5 rounded-[14px] py-3.5 text-[13px] font-sans font-semibold transition-all active:scale-[0.98]",
                    gpsCoords
                      ? "bg-[#E8EFE3] border border-[rgba(63,107,74,0.4)] text-[#3F6B4A]"
                      : "bg-bg-card border border-border text-text-main"
                  )}
                >
                  {isGeolocating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Localizando...
                    </>
                  ) : gpsCoords ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Ubicación GPS activada
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 text-primary" />
                      Usar mi ubicación actual
                    </>
                  )}
                </button>

                {geoError && (
                  <p className="text-[11px] text-primary font-semibold px-1">
                    ⚠️ {geoError}
                  </p>
                )}

                {usedGps && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-[12px] px-4 py-2 flex items-center gap-2">
                    <span className="text-[14px]">✍️</span>
                    <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight">
                      Completa o corrige tu dirección
                    </p>
                  </div>
                )}

                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-3 rounded-[14px] border",
                    "bg-bg-card border-border"
                  )}
                >
                  <Home className="w-4 h-4 text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => onSetDeliveryAddress(e.target.value)}
                    placeholder="Av. Principal, Edif. Torre, Piso 3..."
                    className="flex-1 bg-transparent outline-none text-[14px] text-text-main font-sans placeholder:text-text-muted/40"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
