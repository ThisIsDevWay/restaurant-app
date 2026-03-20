function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-bg-card shadow-card">
      <div className="aspect-square animate-shimmer" />
      <div className="flex flex-col gap-2 p-3">
        <div className="animate-shimmer h-3.5 w-3/4 rounded" />
        <div className="animate-shimmer h-5 w-1/2 rounded" />
        <div className="animate-shimmer h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
