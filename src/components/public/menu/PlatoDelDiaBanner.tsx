"use client";

import { SafeImage } from "@/components/shared/SafeImage";
import { formatBs, formatRef } from "@/lib/money";
import type { MenuItemWithComponents as MenuItem } from "@/types/menu.types";
import { Sparkles, ShoppingBag } from "lucide-react";

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
        className="relative w-full overflow-hidden rounded-[20px] border border-border md:border-white/5 bg-bg-card md:bg-[#120d04] text-left transition-all active:scale-[0.98] shadow-card flex flex-row md:block group min-h-[170px] md:h-[220px]"
      >
        {/* Left Side: Information & Branding (Side-by-side on mobile, absolute overlay on desktop) */}
        <div className="w-[54%] shrink-0 flex flex-col justify-between p-4 relative z-20 md:absolute md:inset-0 md:w-full md:h-full md:p-8 md:pl-10 md:pb-7 md:pr-8">
          {/* Live Ribbon Accent */}
          <div className="flex items-center gap-1 self-start rounded-full bg-gradient-to-r from-primary to-primary-hover border border-primary/20 px-2.5 py-0.5 text-[8px] md:text-[10px] font-extrabold uppercase tracking-[0.18em] md:tracking-[0.2em] text-white shadow-sm md:px-3 md:py-1">
            <Sparkles className="h-2.5 w-2.5 fill-white md:h-3 md:w-3" />
            <span>Plato del día</span>
          </div>

          {/* Title & Category */}
          <div className="my-2 flex flex-col gap-0.5 md:gap-1">
            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] text-primary md:text-[#fff8f3]/90 font-sans">
              {item.categoryName}
            </span>
            <h2 className="font-display text-[15px] sm:text-[18px] md:text-[30px] font-black leading-tight text-text-main md:text-white tracking-tight line-clamp-2 md:line-clamp-1 max-w-[85%] md:max-w-[55%] mb-0.5 md:mb-2">
              {item.name}
            </h2>
          </div>

          {/* Pricing & CTA */}
          <div className="flex flex-col gap-1 md:gap-1.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="font-display text-[16px] sm:text-[19px] md:text-[24px] font-black text-text-main md:text-white tabular-nums tracking-tight">
                {formatBs(priceBsCents, { rounded: true })}
              </span>
              <span className="text-[10px] md:text-[13px] font-bold text-text-muted/80 md:text-white/80 tabular-nums tracking-wider leading-none">
                ({formatRef(item.priceUsdCents)})
              </span>
            </div>

            {/* "Pide el Tuyo Ya!" Call to Action */}
            <div className="flex items-center gap-1.5 text-text-muted md:text-white/80 group-hover:text-primary md:group-hover:text-white/100 font-bold uppercase tracking-wider text-[9px] md:text-[11px] transition-colors duration-200 mt-1">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Pide el Tuyo Ya!</span>
            </div>
          </div>
        </div>

        {/* Premium Horizontal Dark Gradient Overlay (Desktop only, slightly lowered opacity/intensity) */}
        <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 via-[32%] via-black/20 to-transparent z-10" />

        {/* Image Container (Direct absolute position on desktop, direct relative flex container on mobile) */}
        <div className="relative w-[46%] shrink-0 bg-transparent md:absolute md:inset-0 md:w-full md:h-full md:z-0">
          {item.imageUrl ? (
            <SafeImage
              src={item.imageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 768px) 50vw, 1200px"
              className="transition-transform duration-[800ms] object-contain md:object-cover scale-[1.6] translate-x-3 md:translate-x-0 md:scale-100 group-hover:scale-[1.35] md:group-hover:scale-[1.04]"
              quality={90}
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl">
              🍽️
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
