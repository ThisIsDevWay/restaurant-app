/**
 * "Incluye: …" pill shown under an item's title. Byte-identical markup
 * previously duplicated across both card variants.
 */
export function IncludedNoteBadge({ note }: { note: string }) {
  return (
    <div className="mt-1.5 flex justify-center">
      <p className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
        <span>✓</span>
        Incluye: {note}
      </p>
    </div>
  );
}
