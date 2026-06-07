import React from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeSwitch({
    theme,
    onToggle,
    variant = "glass",
}: {
    theme: "light" | "dark";
    onToggle: () => void;
    variant?: "glass" | "solid";
}) {
    const isDark = theme === "dark";
    return (
        <button
            onClick={onToggle}
            aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className={[
                "flex items-center gap-1.5 rounded-full px-2 py-1.5 transition-all duration-300 active:scale-95 select-none",
                variant === "glass"
                    ? "mh-glass-btn text-white"
                    : "bg-surface-section border border-border/60 text-text-main shadow-sm",
            ].join(" ")}
        >
            {/* Sun icon */}
            <Sun
                className={[
                    "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                    isDark ? "opacity-40 scale-90" : "opacity-100 scale-100",
                ].join(" ")}
                strokeWidth={2.2}
            />
            {/* Pill track */}
            <span
                className="relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-300"
                style={{ background: isDark ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.30)" }}
            >
                <span
                    className="absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-300"
                    style={{ transform: isDark ? "translateX(15px)" : "translateX(2px)" }}
                />
            </span>
            {/* Moon icon */}
            <Moon
                className={[
                    "h-3.5 w-3.5 shrink-0 transition-all duration-300",
                    isDark ? "opacity-100 scale-100" : "opacity-40 scale-90",
                ].join(" ")}
                strokeWidth={2.2}
            />
        </button>
    );
}
