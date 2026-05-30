"use client";
 
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
 
interface SettingsSaveBarProps {
  isSaving: boolean;
  onDiscard: () => void;
}
 
export function SettingsSaveBar({ isSaving, onDiscard }: SettingsSaveBarProps) {
  return (
    <div className="fixed bottom-0 left-0 lg:left-16 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-border/60 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-elevated">
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
            className="flex-1 sm:flex-none h-11 px-6 rounded-xl border-border/60 font-bold hover:bg-muted active:scale-98 transition-all"
            disabled={isSaving}
          >
            Descartar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
            className="flex-[2] sm:flex-none px-10 h-11 rounded-xl bg-primary hover:bg-primary/95 text-white shadow-lg shadow-primary/20 transition-all font-bold text-sm active:scale-98"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

