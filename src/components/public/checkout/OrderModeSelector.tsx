import { useState, useCallback } from "react";
import { Store, Package, MapPin, ChevronLeft, Loader2 } from "lucide-react";
import { formatRef } from "@/lib/money";
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
        // Pre-rellenar el campo de dirección con las coordenadas
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
            : "No se pudo obtener ubicación. Escribe tu dirección manualmente."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
    );
  }, [onSetGpsCoords, onSetDeliveryAddress]);

  return (
    <div className="bg-white rounded-[16px] p-4 border border-black/[0.06]">
      <div className="text-[11px] font-medium tracking-[0.06em] text-[#9A6A5A] uppercase mb-3">
        ¿Cómo prefieres tu pedido?
      </div>

      <div className={`grid gap-2 ${availableModes.length === 3 ? "grid-cols-3" : availableModes.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {availableModes.map((mode) => {
          const Icon = MODE_ICONS[mode.id];
          const selected = orderMode === mode.id;
          return (
            <div
              key={mode.id}
              onClick={() => onSetOrderMode(mode.id)}
              className={`rounded-xl p-3 border-[1.5px] cursor-pointer transition-all ${selected ? "bg-[#FBF0EC] border-[#7B2D2D]" : "bg-[#FAF5F2] border-transparent"}`}
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 transition-colors ${selected ? "bg-[#7B2D2D] text-white" : "bg-[#E8DED8] text-[#7B5050]"}`}>
                <Icon className="w-[15px] h-[15px]" strokeWidth={2} />
              </div>
              <div className="text-[13px] font-medium text-[#1A0A0A]">{MODE_LABELS[mode.id]}</div>
              <div className="text-[11px] text-[#9A6A5A] mt-[1px]">{MODE_DESCRIPTIONS[mode.id]}</div>

              {mode.id === "delivery" && surcharges.deliveryUsdCents > 0 && selected && (
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

          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isGeolocating}
            className={`w-full flex items-center justify-center gap-2 rounded-[10px] py-2.5
              text-[13px] font-medium transition-all active:scale-[0.98] disabled:opacity-60 mb-2
              ${gpsCoords
                ? "bg-green-50 border border-green-200 text-green-700"
                : "bg-[#7B2D2D]/10 border border-[#7B2D2D]/20 text-[#7B2D2D]"
              }`}
          >
            {isGeolocating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Obteniendo ubicación...</>
            ) : gpsCoords ? (
              <><MapPin className="w-4 h-4" /> 📍 Ubicación obtenida ✓</>
            ) : (
              <><MapPin className="w-4 h-4" /> Usar mi ubicación actual (GPS)</>
            )}
          </button>

          {geoError && (
            <p className="text-[11px] text-red-600 mb-2 px-1">{geoError}</p>
          )}

          <div className="flex items-center gap-2 my-2">
            <div className="flex-1 h-[0.5px] bg-black/10" />
            <span className="text-[11px] text-[#9A6A5A]">o escribe la dirección</span>
            <div className="flex-1 h-[0.5px] bg-black/10" />
          </div>

          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => onSetDeliveryAddress(e.target.value)}
            placeholder="Ej: Av. Principal, Edif. Torre, Piso 3..."
            className="w-full bg-transparent border-none outline-none text-[13px] text-[#3C1A1A] font-sans placeholder:text-[#C4A090]"
            disabled={isSubmitting}
          />
        </div>
      )}
    </div>
  );
}
