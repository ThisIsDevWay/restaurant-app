/**
 * "Incluye: …" pill shown under an item's title. Byte-identical markup
 * previously duplicated across both card variants.
 */
export function IncludedNoteBadge({ note }: { note: string }) {
  return (
    <div className="mt-1.5 flex justify-start">
      <div className="inline-flex items-center gap-1.5 rounded-[6px] bg-surface-section/40 border border-border/50 px-2.5 py-0.5 text-[11px] font-medium text-text-main">
        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-2 w-2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="font-mono text-[9px] font-bold tracking-widest text-text-muted uppercase shrink-0 mt-px">
          Incluye:
        </span>
        <span className="text-text-main/90 font-medium leading-tight mt-px">
          {note}
        </span>
      </div>
    </div>
  );
}
