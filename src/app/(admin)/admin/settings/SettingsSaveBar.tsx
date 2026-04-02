"use client";

import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsSaveBarProps {
  isSaving: boolean;
  onDiscard: () => void;
}

export function SettingsSaveBar({ isSaving, onDiscard }: SettingsSaveBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-border z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="hidden sm:block">
          <p className="text-sm font-black text-text-main leading-none mb-1">Configuración del Restaurante</p>
          <p className="text-[11px] text-text-muted font-medium">Los cambios se aplicarán al presionar guardar.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={onDiscard}
            className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-border/60 font-bold hover:bg-muted"
            disabled={isSaving}
          >
            Descartar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-[2] sm:flex-none px-10 h-12 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all font-bold text-base"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
