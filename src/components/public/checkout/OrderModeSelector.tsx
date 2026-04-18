import { useState, useCallback, useRef, useEffect } from "react";
import { Store, Package, MapPin, ChevronLeft, Loader2, CheckCircle2, AlertCircle, Home } from "lucide-react";
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
  settings: { deliveryCoverage: string | null } | null;
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
  const addressRef = useRef<HTMLDivElement>(null);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setIsGeolocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: GpsCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        onSetGpsCoords(coords);
        onSetDeliveryAddress(
          `GPS: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${Math.round(coords.accuracy)}m)`
        );
        setIsGeolocating(false);
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
    <div className="bg-bg-card rounded-[20px] p-5 border border-border shadow-sm">
      {/* ✅ M1: Header */}
      <div className="text-[11px] font-display font-black tracking-[0.1em] text-text-muted uppercase mb-4 flex items-center gap-2 opacity-80">
        <span className="w-4 h-[1px] bg-border" />
        ¿Cómo prefieres tu pedido?
      </div>

      {/* ✅ M1: Selector Cards */}
      <div className={cn(
        "grid gap-3",
        availableModes.length === 3 ? "grid-cols-3" : "grid-cols-2"
      )}>
        {availableModes.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          const selected = orderMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSetOrderMode(mode.id)}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-[18px] p-4 transition-all duration-300 border-[1.5px] group",
                selected 
                  ? "bg-[#FAF5F2] border-[#7B2D2D] shadow-md scale-[1.02]" 
                  : "bg-surface-section border-transparent hover:bg-border/10 active:scale-95"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-all duration-500",
                selected ? "bg-[#7B2D2D] text-white shadow-lg shadow-[#7B2D2D]/20 scale-110" : "bg-bg-card text-text-muted group-hover:scale-110"
              )}>
                <Icon className="w-7 h-7" strokeWidth={selected ? 2.5 : 2} />
              </div>
              
              <span className={cn(
                "text-[clamp(11px,3vw,13px)] font-display font-black tracking-tight transition-colors text-center uppercase",
                selected ? "text-[#7B2D2D]" : "text-text-main"
              )}>
                {MODE_LABELS[mode.id]}
              </span>
              <span className="text-[9px] font-bold text-text-muted/60 uppercase tracking-widest mt-1 text-center leading-tight">
                {MODE_DESCRIPTIONS[mode.id]}
              </span>

              {/* Selection Dot */}
              {selected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#7B2D2D] animate-in zoom-in" />
              )}
            </button>
          );
        })}
      </div>

      {/* ✅ M1: Delivery Address with max-h transition */}
      <div 
        ref={addressRef}
        className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          orderMode === "delivery" ? "max-h-[400px] opacity-100 mt-5 pt-5 border-t border-border/40" : "max-h-0 opacity-0 mt-0 pt-0 border-t-0"
        )}
      >
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-display font-black text-text-main tracking-tight uppercase">
                <MapPin className="w-4 h-4 text-[#7B2D2D]" />
                Dirección de entrega
              </div>
              
              {surcharges.deliveryUsdCents > 0 && (
                <div className="text-[11px] font-black text-[#7B2D2D] bg-[#7B2D2D]/5 px-3 py-1 rounded-full border border-[#7B2D2D]/10 shadow-sm">
                  + {formatRef(surcharges.deliveryUsdCents)} envío
                </div>
              )}
            </div>

            {settings?.deliveryCoverage && (
              <div className="bg-amber-50/50 border border-amber-200/30 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-tight font-bold text-amber-900/70 uppercase tracking-wider">
                  {settings.deliveryCoverage}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={isGeolocating}
              className={cn(
                "w-full flex items-center justify-center gap-3 rounded-[14px] py-3.5 text-[13px] font-display font-black transition-all active:scale-[0.98] shadow-sm",
                gpsCoords 
                  ? "bg-[#2A7A4A] text-white shadow-[#2A7A4A]/20" 
                  : "bg-white text-text-main border border-border hover:bg-surface-section"
              )}
            >
              {isGeolocating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Localizando...</>
              ) : gpsCoords ? (
                <><CheckCircle2 className="w-4 h-4" /> Ubicación GPS activada</>
              ) : (
                <><MapPin className="w-4 h-4 text-[#7B2D2D]" /> Usar mi ubicación actual</>
              )}
            </button>

            {geoError && (
              <div className="text-[11px] text-[#7B2D2D] font-bold px-1 bg-[#7B2D2D]/5 p-2 rounded-lg border border-[#7B2D2D]/10 animate-in shake">
                ⚠️ {geoError}
              </div>
            )}

            <div className="relative group">
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => onSetDeliveryAddress(e.target.value)}
                placeholder="Ej: Av. Principal, Edif. Torre, Piso 3..."
                className="w-full bg-surface-section rounded-xl px-4 py-3.5 border border-border/40 outline-none text-[14px] text-text-main font-sans placeholder:text-text-muted/30 focus:border-[#7B2D2D]/40 focus:bg-white transition-all shadow-sm"
                disabled={isSubmitting}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted/20 group-focus-within:text-[#7B2D2D]/40 transition-colors">
                <Home className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
