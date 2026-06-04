/**
 * "Agotado" overlay shown on top of an item's image when it's unavailable.
 * Byte-identical markup previously duplicated across both card variants
 * (and twice within the Classic card).
 */
export function SoldOutBadge() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <span className="rounded-full bg-error px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg ring-1 ring-white/20">
        Agotado
      </span>
    </div>
  );
}
