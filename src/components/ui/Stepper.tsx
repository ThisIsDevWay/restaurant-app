"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

export function Stepper({
  value,
  min = 0,
  max,
  onChange,
  className,
}: StepperProps) {
  const isMin = value <= min;
  const isMax = value >= max;

  return (
    <div
      className={cn(
        "inline-flex items-center border border-border/50 rounded-full bg-bg-card overflow-hidden h-8 shrink-0",
        className
      )}
    >
      <button
        type="button"
        onClick={() => !isMin && onChange(value - 1)}
        disabled={isMin}
        className={cn(
          "w-8 h-full flex items-center justify-center text-text-main transition-all",
          isMin ? "opacity-30 cursor-not-allowed" : "active:bg-text-main/10"
        )}
        aria-label="Disminuir"
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <div className="w-8 h-full flex items-center justify-center border-x border-border/50">
        <span className="text-[13px] font-bold text-text-main font-display select-none">
          {value}
        </span>
      </div>

      <button
        type="button"
        onClick={() => !isMax && onChange(value + 1)}
        disabled={isMax}
        className={cn(
          "w-8 h-full flex items-center justify-center text-text-main transition-all",
          isMax ? "opacity-30 cursor-not-allowed" : "active:bg-text-main/10"
        )}
        aria-label="Aumentar"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
