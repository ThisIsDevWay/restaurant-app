import { cn } from "@/lib/utils";
import Image from "next/image";
import { Plus } from "lucide-react";
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
    imageUrl,
    priority = false,
    hasRequiredOptions,
    categoryIsSimple,
    onOpenDetail,
    onAddSimpleItem,
}: MenuItemCardClassicProps) {
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
                    {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="rounded-full bg-error px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                                Agotado
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="relative w-full aspect-[4/3] bg-gray-50 flex items-center justify-center border-b border-border/50">
                    <span className="text-5xl">{emoji}</span>
                    {!isAvailable && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="rounded-full bg-error px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
                                Agotado
                            </span>
                        </div>
                    )}
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
                    {includedNote && (
                        <div className="mt-1.5 flex justify-center">
                            <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                <span>✓</span>
                                Incluye: {includedNote}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-2 flex items-end justify-between gap-1.5">
                    <div className="flex flex-wrap items-baseline gap-1.5 min-w-0 flex-1">
                        <span
                            className="font-black leading-tight text-text-main tracking-tight shrink-0"
                            style={{ fontSize: "clamp(0.95rem, 3.5vw, 1.15rem)" }}
                            title={`Bs. ${(priceBsCents / 100).toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}`}
                        >
                            Bs. {(priceBsCents / 100).toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                        </span>
                        <span className="rounded bg-bg-app px-1.5 py-0.5 text-[10px] font-bold text-text-muted shadow-sm border border-border/40 whitespace-nowrap shrink-0">
                            ${(priceUsdCents / 100).toFixed(2).replace(".", ",")}
                        </span>
                    </div>

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
