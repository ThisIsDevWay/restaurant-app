"use client";

import { SafeImage } from "@/components/shared/SafeImage";
import { formatBs, formatRef } from "@/lib/money";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";
import { Sparkles } from "lucide-react";

interface PlatoDelDiaBannerProps {
  item: MenuItem | null;
  rate: number | null;
  onOpenDetail: (id: string) => void;
}

export function PlatoDelDiaBanner({
  item,
  rate,
  onOpenDetail,
}: PlatoDelDiaBannerProps) {
  if (!item) return null;

  const priceBsCents = rate ? Math.round(item.priceUsdCents * rate) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8 xl:px-10 pt-1 pb-3 md:pb-5">
      <button
        type="button"
        onClick={() => onOpenDetail(item.id)}
        className="relative w-full aspect-[2.4/1] md:aspect-none md:h-[220px] overflow-hidden rounded-[20px] bg-[#120d04] text-left transition-all active:scale-[0.97] shadow-[0_12px_30px_rgba(0,0,0,0.25)] flex flex-col justify-between pt-4 pl-6 pb-5 pr-5 md:pt-6 md:pl-10 md:pb-7 md:pr-8 border border-white/5 group"
      >
        {/* Real photo background */}
        {item.imageUrl ? (
          <SafeImage
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover transition-transform duration-[800ms] group-active:scale-105"
            quality={80}
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[#f5ece0] flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* Premium Horizontal Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/90 via-[35%] via-black/45 to-transparent z-10" />

        {/* Live Ribbon Accent */}
        <div className="relative z-20 self-start flex items-center gap-1 rounded-full bg-gradient-to-r from-[#d91e18] to-[#96090c] border border-red-500/20 px-2.5 py-0.5 text-[8px] md:text-[10px] font-extrabold uppercase tracking-[0.18em] md:tracking-[0.2em] text-white shadow-md shadow-red-950/40 md:px-3 md:py-1">
          <Sparkles className="h-2.5 w-2.5 fill-white md:h-3 md:w-3" />
          Plato del día
        </div>

        {/* Text Content */}
        <div className="relative z-20 flex flex-col justify-end w-full">
          <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-[#dca153] mb-1 font-sans">
            {item.categoryName}
          </span>
          <h2 className="font-epilogue text-[18px] md:text-[30px] font-black leading-tight text-white tracking-tight line-clamp-1 max-w-[70%] md:max-w-[55%] mb-1.5 md:mb-2.5">
            {item.name}
          </h2>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-epilogue text-[17px] md:text-[24px] font-black text-white tabular-nums tracking-tight">
              {formatBs(priceBsCents, { rounded: true })}
            </span>
            <span className="text-[11px] md:text-[13px] font-bold text-amber-400/90 tabular-nums select-none tracking-wider leading-none">
              ({formatRef(item.priceUsdCents)})
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
