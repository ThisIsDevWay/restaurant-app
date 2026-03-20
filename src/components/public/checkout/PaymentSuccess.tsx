"use client";

import { formatBs } from "@/lib/money";
import Link from "next/link";
import type { CartItem } from "@/store/cartStore";

interface PaymentSuccessProps {
  exactAmountBsCents: number;
  items: CartItem[];
}

export function PaymentSuccess({
  exactAmountBsCents,
  items,
}: PaymentSuccessProps) {
  return (
    <div className="flex flex-col items-center px-4 pt-20 text-center">
      <div className="flex h-20 w-20 animate-check-appear items-center justify-center rounded-full bg-success">
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="mt-6 text-2xl font-bold text-success">
        ¡Pago Confirmado!
      </h2>
      <p className="mt-2 text-sm text-text-muted">
        Tu pedido ya está en cocina. En breve estará listo.
      </p>

      <div className="mt-8 w-full max-w-sm rounded-card border border-border bg-white p-4 text-left shadow-card">
        <p className="mb-2 text-sm font-semibold text-text-main">📋 Resumen</p>
        {items.map((item, idx) => (
          <p key={idx} className="text-sm text-text-main">
            {item.quantity}× {item.name}
          </p>
        ))}
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-sm font-bold text-price-green">
            Total {formatBs(exactAmountBsCents)}
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="mt-8 rounded-input bg-primary px-8 py-3 text-sm font-semibold text-white"
      >
        Volver al menú
      </Link>
    </div>
  );
}
