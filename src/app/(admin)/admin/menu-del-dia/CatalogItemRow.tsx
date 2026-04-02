"use client";

import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { formatRef } from "@/lib/money";
import type { CatalogItem } from "@/app/(admin)/admin/menu-del-dia/DailyMenu.types";

interface CatalogItemRowProps {
  item: CatalogItem;
  isOn: boolean;
  onToggle: (id: string) => void;
}

export function CatalogItemRow({ item, isOn, onToggle }: CatalogItemRowProps) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`group flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isOn
        ? "bg-primary/[0.03] border-primary/30 shadow-sm hover:border-primary/50"
        : "bg-white border-transparent hover:border-border hover:shadow-sm"
        }`}
    >
      <div
        className={`h-5 w-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all shadow-sm ${isOn
          ? "bg-primary border-primary text-white"
          : "bg-white border border-border group-hover:border-primary/40 text-transparent"
          }`}
      >
        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />
      </div>

      {item.imageUrl ? (
        <Image
          src={item.imageUrl}
          alt={item.name}
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-border/50"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-bg-app flex-shrink-0 ring-1 ring-border/50" />
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate transition-colors ${isOn ? "text-primary" : "text-text-main"}`}>
          {item.name}
        </p>
        <p className="text-xs font-semibold text-price-green mt-0.5">
          {formatRef(item.priceUsdCents)}
        </p>
      </div>
    </button>
  );
}
