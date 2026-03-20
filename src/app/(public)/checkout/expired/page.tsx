"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";

export default function ExpiredPage() {
  const [waNumber, setWaNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => setWaNumber(d.whatsappNumber))
      .catch(() => setWaNumber(null));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg-app px-6 text-center">
      <Clock size={56} className="text-amber" strokeWidth={1.5} />

      <h1 className="text-[20px] font-bold text-text-main">
        Tu pedido expiró
      </h1>

      <div className="max-w-[280px]">
        <p className="text-[14px] leading-relaxed text-text-muted">
          Pasaron más de 30 minutos sin recibir la transferencia.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-text-muted">
          Si ya pagaste, guarda tu número de referencia y muéstraselo al cajero
          para verificarlo.
        </p>
      </div>

      <div className="mt-2 flex w-full max-w-[320px] flex-col gap-3">
        <Link
          href="/"
          className="flex h-[52px] w-full items-center justify-center rounded-input bg-primary text-[15px] font-semibold text-white"
        >
          Hacer nuevo pedido
        </Link>

        <a
          href={waNumber ? `https://wa.me/${waNumber}` : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-input border border-border text-[15px] font-semibold text-text-main ${
            !waNumber ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Hablar con el cajero
        </a>
      </div>
    </div>
  );
}
