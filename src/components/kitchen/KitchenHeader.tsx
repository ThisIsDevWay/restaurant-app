import { Clock, ChefHat, AlertCircle, Flame, CheckCircle2 } from "lucide-react";

interface KitchenHeaderProps {
  restaurantName: string;
  logoUrl?: string;
  timeStr: string;
  pendingCount: number;
  cookingCount: number;
  readyCount: number;
  onReadyClick?: () => void;
}

export function KitchenHeader({
  restaurantName, logoUrl, timeStr,
  pendingCount, cookingCount, readyCount,
  onReadyClick
}: KitchenHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={restaurantName}
              className="h-12 w-auto max-w-[180px] object-contain rounded-sm"
            />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
                <ChefHat className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-primary leading-tight">
                  {restaurantName} Cocina
                </h1>
              </div>
            </div>
          )}
          {!logoUrl && <p className="text-xs text-text-muted">Sistema KDS</p>}
          {logoUrl && (
            <div className="hidden sm:block">
              <h1 className="font-display text-lg font-bold text-primary leading-tight">Cocina</h1>
              <p className="text-xs text-text-muted">Sistema KDS</p>
            </div>
          )}
        </div>

        {/* Clock */}
        <div className="hidden sm:flex items-center gap-2 text-2xl font-bold font-mono text-text-main tabular-nums">
          <Clock className="h-5 w-5 text-text-muted" />
          {timeStr}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl bg-amber/10 px-3 py-1.5">
            <AlertCircle className="h-4 w-4 text-amber" />
            <span className="text-sm font-bold text-amber">{pendingCount}</span>
            <span className="hidden sm:inline text-xs text-amber/80">Nuevos</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-info/10 px-3 py-1.5">
            <Flame className="h-4 w-4 text-info" />
            <span className="text-sm font-bold text-info">{cookingCount}</span>
            <span className="hidden sm:inline text-xs text-info/80">Cocinando</span>
          </div>
          <button
            onClick={onReadyClick}
            className="flex items-center gap-1.5 rounded-xl bg-success/10 px-3 py-1.5 hover:bg-success/20 active:scale-[0.98] transition-all cursor-pointer text-left border-0 focus:outline-none"
            title="Ver pedidos listos"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-bold text-success">{readyCount}</span>
            <span className="hidden sm:inline text-xs text-success/80">Listos</span>
          </button>
        </div>
      </div>
    </header>
  );
}
