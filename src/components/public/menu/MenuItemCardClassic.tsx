import { cn } from "@/lib/utils";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useMenuItemCard } from "@/hooks/useMenuItemCard";
import { SoldOutBadge } from "./_parts/SoldOutBadge";
import { IncludedNoteBadge } from "./_parts/IncludedNoteBadge";

export interface MenuItemCardClassicProps {
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

export function MenuItemCardClassic({
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
}: MenuItemCardClassicProps) {
    const { emoji, isReadOnly, handleAdd } = useMenuItemCard({
        id, name, priceUsdCents, priceBsCents, categoryName, categoryAllowAlone,
        categoryIsSimple, isPrepackaged, includedNote, isAvailable, hasRequiredOptions,
        onOpenDetail, onAddSimpleItem,
    });

    return (
        <div
            onClick={handleAdd}
            className={cn(
                "relative flex flex-col cursor-pointer overflow-hidden rounded-[16px] border border-border bg-bg-card shadow-card transition-all duration-150 active:scale-[0.98] active:border-primary-hover min-h-[220px]",
                !isAvailable && "cursor-default opacity-80",
            )}
        >
            {/* Top: Image (Classic vertical layout) */}
            {imageUrl ? (
                <div className="relative w-full aspect-[4/3] bg-bg-image overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 250px"
                        quality={75}
                        priority={priority}
                    />
                    {!isAvailable && <SoldOutBadge />}
                </div>
            ) : (
                <div className="relative w-full aspect-[4/3] bg-gray-50 flex items-center justify-center border-b border-border/50">
                    <span className="text-5xl">{emoji}</span>
                    {!isAvailable && <SoldOutBadge />}
                </div>
            )}

            {/* Bottom: Info */}
            <div className="flex flex-1 flex-col justify-between px-3 py-2.5">
                <div>
                    <h3
                        className="font-bold leading-tight text-text-main"
                        style={{ fontSize: "clamp(0.95rem, 3.8vw, 1.1rem)" }}
                    >
                        {name}
                    </h3>

                    {description && (
                        <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-text-muted">
                            {description}
                        </p>
                    )}
                    {includedNote && <IncludedNoteBadge note={includedNote} />}
                </div>

                <div className="mt-auto pt-2 flex items-end justify-between gap-1.5">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 min-w-0 flex-1">
                        <span
                            className="font-black leading-tight text-text-main tracking-tight shrink-0"
                            style={{ fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)" }}
                            title={`Bs. ${Math.round(priceBsCents / 100).toLocaleString("es-VE", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}`}
                        >
                            Bs. {Math.round(priceBsCents / 100).toLocaleString("es-VE", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                        </span>
                        <span className="text-[10px] font-bold text-text-muted/80 whitespace-nowrap shrink-0">
                            (REF. {(priceUsdCents / 100).toFixed(2).replace(".", ",")})
                        </span>
                    </div>

                    {!isReadOnly && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                            disabled={!isAvailable}
                            className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors shadow-sm",
                                isAvailable
                                    ? "bg-primary text-white active:bg-primary-hover shadow-primary/20"
                                    : "bg-gray-100 text-gray-400 border border-gray-200",
                            )}
                            aria-label={`Agregar ${name}`}
                        >
                            <Plus className="h-4 w-4" strokeWidth={3} />
                        </button>
                    )}
                </div>

                {!categoryAllowAlone && isAvailable && (
                    <span className="mt-2 self-start rounded-full bg-amber/10 border border-amber/20 px-2 py-0.5 text-[10px] font-bold text-amber">
                        No disponible solo
                    </span>
                )}
            </div>
        </div>
    );
}
