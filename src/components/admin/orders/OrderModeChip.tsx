"use client";

import { Badge } from "@/components/ui/badge";
import { Home, ShoppingBag, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderMode = "delivery" | "take_away" | "on_site" | "pickup" | "dine_in";

interface OrderModeChipProps {
    mode: OrderMode | string;
    className?: string;
}

const MODE_CONFIG: Record<
    string,
    { label: string; icon: typeof Home; className: string }
> = {
    delivery: {
        label: "Delivery",
        icon: Home,
        className: "bg-blue-50 text-blue-700 border-blue-100",
    },
    take_away: {
        label: "Retira en el local",
        icon: ShoppingBag,
        className: "bg-purple-50 text-purple-700 border-purple-100",
    },
    pickup: {
        label: "Retira en el local",
        icon: ShoppingBag,
        className: "bg-purple-50 text-purple-700 border-purple-100",
    },
    on_site: {
        label: "Comer en el local",
        icon: Utensils,
        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    dine_in: {
        label: "Comer en el local",
        icon: Utensils,
        className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
};

export function OrderModeChip({ mode, className }: OrderModeChipProps) {
    const config = MODE_CONFIG[mode] ?? {
        label: mode,
        icon: ShoppingBag,
        className: "bg-gray-50 text-gray-700 border-gray-100",
    };

    const Icon = config.icon;

    return (
        <Badge
            variant="outline"
            className={cn(
                "flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                config.className,
                className
            )}
        >
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}
