"use client"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: "sm" | "default"
  onClick?: (e: React.MouseEvent) => void
}

function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  size = "default",
  onClick,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!disabled && !e.defaultPrevented) onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        size === "default" ? "h-6 w-11" : "h-5 w-9",
        checked
          ? "bg-primary border-primary"
          : "bg-gray-200 border-gray-200",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200",
          size === "default" ? "h-5 w-5" : "h-4 w-4",
          checked
            ? size === "default" ? "translate-x-5" : "translate-x-4"
            : "translate-x-0",
        )}
      />
    </button>
  )
}

export { Switch }
