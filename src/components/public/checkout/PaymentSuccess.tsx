"use client";

import { formatBs } from "@/lib/money";
import Link from "next/link";
import type { CartItem } from "@/store/cartStore";
import { CheckCircle2, Clipboard, Check } from "lucide-react";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);
  const shortId = orderId.slice(-6).toUpperCase();

  const copyId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-app">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm bg-bg-card rounded-[32px] p-8 border border-border shadow-xl shadow-black/5 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          
          <h1 className="text-2xl font-display font-black text-text-main mb-2">
            ¡Pago confirmado!
          </h1>
          <p className="text-text-muted mb-8 leading-relaxed text-sm">
            Tu pedido ha sido recibido con éxito y ya está en cocina.
          </p>

          <div className="w-full bg-primary/5 rounded-2xl p-5 border border-primary/10 mb-8">
            <div className="text-[10px] font-display font-bold uppercase tracking-[0.12em] text-text-muted/60 mb-1.5 text-center">
              Número de Pedido
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-full font-display font-black text-lg tracking-wider">
                #{shortId}
              </div>
              <button
                onClick={copyId}
                className="p-2 rounded-full bg-surface-section border border-border text-text-muted active:text-primary transition-colors"
                title="Copiar ID completo"
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Clipboard className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="w-full space-y-3 mb-8">
             <Link
                href="/"
                className="w-full py-4 bg-primary text-white font-display font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
              >
                Volver al Inicio
              </Link>

              <Link
                href="/mis-pedidos"
                className="w-full py-4 bg-surface-section text-text-main font-display font-bold rounded-xl border border-border hover:bg-border/20 transition-all active:scale-[0.98]"
              >
                Ver Mis Pedidos
              </Link>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 border-t border-border bg-bg-card/50 text-center">
        <p className="text-[12px] text-text-muted leading-relaxed max-w-[280px] mx-auto">
          Te enviaremos actualizaciones sobre el estado de tu pedido por WhatsApp.
        </p>
      </div>
    </div>
  );
}
