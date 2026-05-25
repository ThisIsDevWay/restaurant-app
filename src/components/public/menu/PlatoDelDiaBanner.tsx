"use client";

import Image from "next/image";
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
    <div className="md:hidden w-full px-4 pt-2 pb-4">
      <button
        type="button"
        onClick={() => onOpenDetail(item.id)}
        className="relative w-full aspect-[16/10] overflow-hidden rounded-[24px] bg-[#251a07] text-left transition-all active:scale-[0.98] shadow-lg flex flex-col justify-end p-5 group"
      >
        {/* Real photo background */}
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover transition-transform duration-700 group-active:scale-105"
            quality={90}
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-[#f5ece0] flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* Premium Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent z-10" />

        {/* Live Ribbon Accent */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-[#bb0005] px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-white shadow-md">
          <Sparkles className="h-3 w-3 fill-white" />
          Plato del día
        </div>

        {/* Text Content */}
        <div className="relative z-20 flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 mb-1.5 font-sans">
            {item.categoryName}
          </span>
          <h2 className="font-epilogue text-[22px] font-bold leading-tight text-white tracking-tight mb-2">
            {item.name}
          </h2>
          <div className="flex items-baseline gap-2.5">
            <span className="font-epilogue text-lg font-black text-white">
              {formatBs(priceBsCents)}
            </span>
            <span className="text-[12px] font-bold text-white/40">
              {formatRef(item.priceUsdCents)}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
