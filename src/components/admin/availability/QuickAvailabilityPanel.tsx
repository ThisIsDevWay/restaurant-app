"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  X, 
  Search, 
  Loader2, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  UtensilsCrossed,
  Plus,
  Coffee,
  Package
} from "lucide-react";
import { toggleDailyItemAvailabilityAction } from "@/actions/availability";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvailabilityItem {
  id: string;
  name: string;
  isAvailable: boolean;
  type: "plato" | "adicional" | "bebida" | "contorno";
}

export function QuickAvailabilityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<AvailabilityItem[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/menu/availability", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      
      const flattened: AvailabilityItem[] = [
        ...data.platos.map((p: any) => ({ ...p, type: "plato" })),
        ...data.adicionales.map((a: any) => ({ ...a, type: "adicional" })),
        ...data.bebidas.map((b: any) => ({ ...b, type: "bebida" })),
        ...data.contornos.map((c: any) => ({ ...c, type: "contorno" })),
      ];

      // We need names too. The API currently only returns IDs.
      // ⚠️ Wait, the API needs to return names to be useful here.
      // I should update the API route.
      
      setItems(flattened);
    } catch (error) {
      toast.error("Error al cargar disponibilidad");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchAvailability();
    }
  }, [isOpen, fetchAvailability]);

  const handleToggle = async (item: AvailabilityItem) => {
    setTogglingId(item.id);
    const newStatus = !item.isAvailable;
    
    const result = await toggleDailyItemAvailabilityAction({
      itemId: item.id,
      isAvailable: newStatus,
      type: item.type,
    });

    if (result?.data?.success) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isAvailable: newStatus } : i));
      toast.success(`${item.name} marcado como ${newStatus ? 'Disponible' : 'AGOTADO'}`);
    } else {
      toast.error("Error al actualizar");
    }
    setTogglingId(null);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#251a07] text-white shadow-2xl transition-all hover:scale-110 active:scale-95 md:h-16 md:w-16"
      >
        <Package className="h-6 w-6 md:h-7 md:w-7" />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-error text-[11px] font-bold ring-2 ring-white">
          86
        </span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-end p-0 md:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#251a07]/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Panel */}
      <div className="relative z-10 flex h-[90vh] w-full flex-col overflow-hidden bg-white shadow-2xl animate-in slide-in-from-right-full duration-500 md:h-[80vh] md:w-[450px] md:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-bg-app/50 p-5 backdrop-blur-md">
          <div>
            <h2 className="text-xl font-black tracking-tight text-[#251a07] font-display">Gestión de Disponibilidad</h2>
            <p className="text-[11px] font-bold uppercase tracking-wider text-error">Panel 86 — Tiempo Real</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#251a07] shadow-sm ring-1 ring-border/50 transition-transform active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input 
              type="text"
              placeholder="Buscar plato o acompañante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-2xl border border-border bg-bg-app pl-10 pr-4 text-[15px] font-medium outline-none ring-primary/20 focus:ring-2"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-10">
          {loading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-xs font-semibold uppercase tracking-widest">Sincronizando...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle size={32} opacity={0.5} />
              <p className="text-sm font-medium">No se encontraron items activos hoy.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => handleToggle(item)}
                  disabled={togglingId === item.id}
                  className={cn(
                    "group flex w-full items-center gap-4 rounded-2xl border p-4 transition-all active:scale-[0.98]",
                    item.isAvailable 
                      ? "border-border bg-white hover:border-primary/20" 
                      : "border-error/20 bg-error/5 opacity-80"
                  )}
                >
                  <div className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors",
                    item.isAvailable ? "bg-bg-app text-[#251a07]" : "bg-error text-white"
                  )}>
                    {item.type === "plato" && <UtensilsCrossed size={20} />}
                    {item.type === "adicional" && <Plus size={20} />}
                    {item.type === "bebida" && <Coffee size={20} />}
                    {item.type === "contorno" && <Package size={20} />}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="text-[15px] font-bold text-[#251a07] leading-tight">{item.name}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">{item.type}</p>
                  </div>

                  <div className="flex items-center justify-center">
                    {togglingId === item.id ? (
                      <Loader2 className="animate-spin text-primary" size={24} />
                    ) : item.isAvailable ? (
                      <CheckCircle2 className="text-emerald-500" size={26} />
                    ) : (
                      <div className="flex h-7 items-center justify-center rounded-full bg-error px-3 text-[10px] font-black uppercase tracking-tighter text-white">
                        Agotado
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 bg-bg-app/50 p-4 text-center">
          <p className="text-[11px] font-semibold text-muted-foreground">
            Los cambios se reflejan instantáneamente para todos los clientes.
          </p>
        </div>
      </div>
    </div>
  );
}
