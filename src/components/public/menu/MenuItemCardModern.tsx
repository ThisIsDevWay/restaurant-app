import { cn } from "@/lib/utils";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useMenuItemCard } from "@/hooks/useMenuItemCard";
import { SoldOutBadge } from "./_parts/SoldOutBadge";
import { IncludedNoteBadge } from "./_parts/IncludedNoteBadge";

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
  isPrepackaged: boolean;
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
  isPrepackaged,
  imageUrl,
  priority = false,
  hasRequiredOptions,
  categoryIsSimple,
  onOpenDetail,
  onAddSimpleItem,
}: MenuItemCardProps) {
  const { emoji, isReadOnly, handleAdd } = useMenuItemCard({
    id, name, priceUsdCents, priceBsCents, categoryName, categoryAllowAlone,
    categoryIsSimple, isPrepackaged, includedNote, isAvailable, hasRequiredOptions,
    onOpenDetail, onAddSimpleItem,
  });

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

        {!isAvailable && <SoldOutBadge />}
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
          {includedNote && <IncludedNoteBadge note={includedNote} />}
        </div>

        <div className="mt-2 flex items-end justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-semibold text-text-main/80 leading-none">Bs.</span>
            <div className="flex items-center gap-2">
              <span
                className="font-extrabold leading-tight text-text-main tracking-tight"
                style={{ fontSize: "clamp(1.15rem, 5vw, 1.4rem)" }}
              >
                {Math.round(priceBsCents / 100).toLocaleString("es-VE", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </span>
              <span className="rounded-md bg-bg-app px-1.5 py-0.5 text-[11px] font-bold text-text-muted border border-border/30">
                REF. {(priceUsdCents / 100).toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>

          {!isReadOnly && (
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
          )}
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
