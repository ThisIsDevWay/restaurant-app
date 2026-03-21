"use client"

import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: "sm" | "default"
}

function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  size = "default",
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        size === "default" ? "h-6 w-11" : "h-5 w-9",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm transition-transform",
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
