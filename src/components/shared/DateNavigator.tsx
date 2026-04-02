"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateNavigatorProps {
  dateLabel: string;
  dateBadge?: string | null;
  onPrev: () => void;
  onNext: () => void;
}

export function DateNavigator({ dateLabel, dateBadge, onPrev, onNext }: DateNavigatorProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
      <button
        onClick={onPrev}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="flex-1 text-center text-sm font-medium text-text-main">
        {dateLabel}
        {dateBadge && (
          <span className="ml-2 text-[10px] font-medium bg-success/10 text-success px-2 py-0.5 rounded-full">
            {dateBadge}
          </span>
        )}
      </span>
      <button
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted hover:bg-bg-app hover:text-text-main transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
