import { ChefHat } from "lucide-react";

export function KitchenEmptyState({ timeStr }: { timeStr: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/5">
        <ChefHat className="h-10 w-10 text-primary/30" />
      </div>
      <p className="text-xl font-bold text-text-main">Cocina libre</p>
      <p className="text-sm text-text-muted mt-1">
        No hay pedidos activos en este momento
      </p>
      <div className="mt-4 text-3xl font-mono font-bold text-text-muted/30">
        {timeStr}
      </div>
    </div>
  );
}

export function KitchenLoadingState() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-app">
      <div className="text-center">
        <ChefHat className="mx-auto mb-3 h-12 w-12 text-primary/30 animate-pulse" />
        <p className="text-lg font-medium text-text-muted">Cargando pedidos...</p>
      </div>
    </div>
  );
}
