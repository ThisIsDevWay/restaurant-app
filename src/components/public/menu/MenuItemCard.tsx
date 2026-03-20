import { cn } from "@/lib/utils";
import Image from "next/image";
import { Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";

const CATEGORY_EMOJI: Record<string, string> = {
  pollos: "🍗",
  carnes: "🥩",
  pastas: "🍝",
  mariscos: "🍤",
  ensaladas: "🥗",
  bebidas: "🥤",
  adicionales: "🍟",
};

interface MenuItemCardProps {
  id: string;
  name: string;
  description: string | null;
  priceUsdCents: number;
  priceBsCents: number;
  categoryName: string;
  categoryAllowAlone: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  hasRequiredOptions: boolean;
  onOpenDetail: () => void;
}

export function MenuItemCard({
  id,
  name,
  description,
  priceUsdCents,
  priceBsCents,
  categoryName,
  categoryAllowAlone,
  isAvailable,
  imageUrl,
  hasRequiredOptions,
  onOpenDetail,
}: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const categoryKey = categoryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const emoji = CATEGORY_EMOJI[categoryKey] || "🍽️";

  const handleAdd = () => {
    if (!isAvailable) return;

    if (hasRequiredOptions) {
      onOpenDetail();
      return;
    }

    addItem({
      id,
      name,
      baseUsdCents: priceUsdCents,
      baseBsCents: priceBsCents,
      emoji,
      selectedContorno: null,
      selectedAdicionales: [],
      categoryAllowAlone,
    });

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-card transition-all duration-150 active:scale-[0.98] active:border-primary-hover",
        !isAvailable && "opacity-80",
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square w-full bg-bg-image">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            {emoji}
          </div>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-error px-3 py-1 text-xs font-semibold text-white">
              No disponible
            </span>
          </div>
        )}

        {!categoryAllowAlone && isAvailable && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-amber/90 px-2 py-0.5 text-[10px] font-semibold text-white">
              No disponible solo
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="text-[14px] font-semibold leading-tight text-text-main">
          {name}
        </h3>

        {description && (
          <p className="mt-1 line-clamp-2 text-[12px] text-text-muted">
            {description}
          </p>
        )}

        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[22px] font-extrabold leading-tight text-text-main">
              {formatBs(priceBsCents)}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-primary/70">
              {formatRef(priceUsdCents)}
            </p>
          </div>

          <button
            onClick={handleAdd}
            disabled={!isAvailable}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-colors",
              isAvailable
                ? "bg-primary text-white active:bg-primary-hover"
                : "bg-border text-text-muted",
            )}
            aria-label={`Agregar ${name}`}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}
