"use client";

import { useCartStore } from "@/store/cartStore";
import { ShoppingBag } from "lucide-react";

export function CartButton() {
  const itemCount = useCartStore((s) => s.itemCount());
  const mounted = useCartStore((s) => s.mounted);

  if (!mounted || itemCount === 0) return null;

  return (
    <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
      <ShoppingBag className="h-5 w-5" />
      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-hover text-[10px] font-bold text-white">
        {itemCount}
      </span>
    </button>
  );
}
