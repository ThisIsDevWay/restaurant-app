"use client";

import React from "react";
import { Tv, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ onPair }: { onPair: () => void }) {
  return (
    <div className="py-12 text-center max-w-md mx-auto">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mb-4 border border-amber-500/15">
        <Tv className="h-7 w-7 text-amber-600 animate-pulse" />
      </div>
      <h3 className="text-base font-bold text-text-main mb-1.5">
        No hay pantallas emparejadas
      </h3>
      <p className="text-xs text-text-muted mb-6 leading-relaxed">
        Comienza emparejando un Smart TV o tablet abriendo la dirección{" "}
        <code className="bg-bg-app px-1.5 py-0.5 rounded text-[11px] font-mono border border-border">
          /tv
        </code>{" "}
        en su navegador y usando el código de enlace de 6 caracteres.
      </p>
      <Button
        size="sm"
        onClick={onPair}
        className="font-semibold h-9 rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/10"
      >
        <PlugZap className="h-4 w-4 mr-1.5" />
        Enlazar Mi Primera TV
      </Button>
    </div>
  );
}
