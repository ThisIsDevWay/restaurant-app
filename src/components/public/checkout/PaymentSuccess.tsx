"use client";

import { formatBs } from "@/lib/money";
import Link from "next/link";
import type { CartItem } from "@/store/cartStore";
import { Clipboard } from "lucide-react";

interface PaymentSuccessProps {
  orderId: string;
  exactAmountBsCents: number;
  items: CartItem[];
}

export function PaymentSuccess({
  orderId,
  exactAmountBsCents,
  items,
}: PaymentSuccessProps) {
  const shortId = orderId.slice(0, 8).toUpperCase();

  const copyId = () => {
    navigator.clipboard.writeText(orderId);
  };

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

      {/* Order ID */}
      <div className="mt-4 flex items-center gap-2 rounded-full bg-bg-app px-4 py-2">
        <span className="text-sm text-text-muted">Pedido:</span>
        <span className="font-mono text-sm font-bold text-text-main">
          #{shortId}
        </span>
        <button
          onClick={copyId}
          className="text-text-muted active:text-primary"
          aria-label="Copiar ID"
        >
          <Clipboard className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8 w-full max-w-sm rounded-card border border-border bg-white p-4 text-left shadow-card">
        <p className="mb-2 text-sm font-semibold text-text-main">Resumen</p>
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
