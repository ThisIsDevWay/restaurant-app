import { cn } from "@/lib/utils";
import Image from "next/image";
import { Plus } from "lucide-react";
import { formatBs, formatRef } from "@/lib/money";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

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
  includedNote?: string | null;
  priceUsdCents: number;
  priceBsCents: number;
  categoryName: string;
  categoryAllowAlone: boolean;
  isAvailable: boolean;
  imageUrl: string | null;
  priority?: boolean;
  hasRequiredOptions: boolean;
  categoryIsSimple: boolean;
  onOpenDetail: () => void;
  onAddSimpleItem?: (payload: any, categoryName: string) => void;
}

export function MenuItemCardModern({
  id,
  name,
  description,
  includedNote,
  priceUsdCents,
  priceBsCents,
  categoryName,
  categoryAllowAlone,
  isAvailable,
  imageUrl,
  priority = false,
  hasRequiredOptions,
  categoryIsSimple,
  onOpenDetail,
  onAddSimpleItem,
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

    const payload = {
      id,
      name,
      baseUsdCents: priceUsdCents,
      baseBsCents: priceBsCents,
      emoji,
      fixedContornos: [],
      contornoSubstitutions: [],
      selectedAdicionales: [],
      removedComponents: [],
      categoryAllowAlone,
      categoryIsSimple,
      categoryName,
      includedNote: includedNote ?? null,
    };

    if (onAddSimpleItem) {
      onAddSimpleItem(payload, categoryName);
    } else {
      addItem(payload);
      toast.success(`${name} añadido al carrito`);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  };

  return (
    <div
      onClick={handleAdd}
      className={cn(
        "relative flex cursor-pointer overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-card transition-all duration-150 active:scale-[0.98] active:border-primary-hover",
        !isAvailable && "cursor-default opacity-80",
      )}
    >
      {/* Left: Image (Clamped width + Aspect Square) */}
      <div 
        className="relative flex shrink-0 items-center justify-center p-1.5"
        style={{ width: "clamp(115px, 38%, 150px)" }}
      >
        {imageUrl ? (
          <div className="relative aspect-square w-full">
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="object-cover rounded-[10px] drop-shadow-sm transition-transform duration-500 hover:scale-105"
              sizes="(max-width: 640px) 38vw, 150px"
              quality={75}
              priority={priority}
            />
          </div>
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-4xl bg-bg-image rounded-[10px]">
            {emoji}
          </div>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="rounded-full bg-error px-2.5 py-0.5 text-[10px] font-semibold text-white">
              No disponible
            </span>
          </div>
        )}
      </div>

      {/* Right: Info */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          <h3
            className="font-semibold leading-tight text-text-main"
            style={{ fontSize: "clamp(0.875rem, 3.6vw, 1rem)" }}
          >
            {name}
          </h3>

          {description && (
            <p className="mt-1 line-clamp-3 text-[12px] leading-snug text-text-muted">
              {description}
            </p>
          )}
          {includedNote && (
            <div className="mt-1.5 flex justify-center">
              <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                <span>✓</span>
                Incluye: {includedNote}
              </p>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold text-text-main/80 leading-none">Bs.</span>
            <div className="flex items-center gap-2">
              <span
                className="font-extrabold leading-tight text-text-main tracking-tight"
                style={{ fontSize: "clamp(1.15rem, 5vw, 1.4rem)" }}
              >
                {(priceBsCents / 100).toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="rounded-md bg-bg-app px-1.5 py-0.5 text-[10px] font-bold text-text-muted border border-border/30">
                ${(priceUsdCents / 100).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); handleAdd(); }}
            disabled={!isAvailable}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              isAvailable
                ? "bg-primary text-white active:bg-primary-hover"
                : "bg-border text-text-muted",
            )}
            aria-label={`Agregar ${name}`}
          >
            <Plus className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        {!categoryAllowAlone && isAvailable && (
          <span className="mt-1.5 self-start rounded-full bg-amber/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            No disponible solo
          </span>
        )}
      </div>
    </div>
  );
}
