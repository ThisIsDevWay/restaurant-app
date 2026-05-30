"use client";

import { cn } from "@/lib/utils";

interface WizardProgressProps {
  step: number;
  totalSteps?: number;
}

export function WizardProgress({ step, totalSteps = 5 }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-center gap-0 px-5 py-2.5 bg-bg-app">
      {Array.from({ length: totalSteps }, (_, i) => {
        const dotStep = i + 1;
        const isCompleted = dotStep < step;
        const isCurrent = dotStep === step;
        return (
          <div key={dotStep} className="flex items-center">
            {/* Dot */}
            <div
              className={cn(
                "rounded-full transition-all duration-[280ms] ease-in-out",
                isCurrent
                  ? "w-[22px] h-2 bg-primary"
                  : isCompleted
                  ? "w-2 h-2 bg-primary"
                  : "w-2 h-2 bg-surface-section"
              )}
            />
            {/* Connector */}
            {dotStep < totalSteps && (
              <div
                className={cn(
                  "h-0.5 w-6 transition-colors duration-[280ms]",
                  isCompleted ? "bg-primary" : "bg-surface-section"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
