import { Store, Package, MapPin, ChevronLeft } from "lucide-react";
import { formatRef } from "@/lib/money";
import type { OrderMode } from "./CheckoutForm.types";

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
  on_site: "Recoge tu pedido en el restaurante",
  take_away: "Llévalo contigo",
  delivery: "Envíalo a tu dirección",
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
}: OrderModeSelectorProps) {
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
