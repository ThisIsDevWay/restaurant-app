"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function CartButton() {
  const itemCount = useCartStore((s) => s.itemCount());
  const mounted = useCartStore((s) => s.mounted);
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (itemCount > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 300);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  if (!mounted || itemCount === 0) return null;

  return (
    <button 
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white transition-transform duration-300",
        isBouncing ? "scale-125" : "scale-100"
      )}
    >
      <ShoppingBag className="h-5 w-5" />
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-hover text-[10px] font-bold text-white shadow-sm border border-white">
        {itemCount}
      </span>
    </button>
  );
}
