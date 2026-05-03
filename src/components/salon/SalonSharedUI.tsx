"use client";

import {
  Square, Circle, RectangleHorizontal,
  Minus, DoorOpen, AppWindow, GlassWater, ChefHat, CreditCard,
  Circle as CircleIcon, ArrowUpDown, Toilet, User, UserRound, Leaf, Type,
} from "lucide-react";
import type { FixtureType } from "@/db/schema/floor-fixtures";
import { paletteFor } from "@/lib/salon-constants";
import type { TableShape } from "@/lib/salon-types";

/**
 * Salon Shared UI Components
 * Part of Heritage Editorial Design System
 */

interface ShapeIconProps {
  shape?: TableShape;
  size?: number;
}

export function ShapeIcon({ shape, size = 14 }: ShapeIconProps) {
  if (shape === "circular") return <Circle size={size} />;
  if (shape === "rectangular") return <RectangleHorizontal size={size} />;
  return <Square size={size} />;
}

interface SectionDotProps {
  section: string | null | undefined;
}

export function SectionDot({ section }: SectionDotProps) {
  const p = paletteFor(section);
  return (
    <span
      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: p.dot }}
    />
  );
}

interface FixtureIconProps {
  type: FixtureType;
  size: number;
  color: string;
}

export function FixtureIcon({ type, size, color }: FixtureIconProps) {
  const props = { size, color, strokeWidth: 1.8 };
  switch (type) {
    case "wall_h": case "wall_v": case "divider": return <Minus {...props} />;
    case "door": case "door_double": return <DoorOpen {...props} />;
    case "window":      return <AppWindow {...props} />;
    case "bar_counter": return <GlassWater {...props} />;
    case "kitchen_pass": return <ChefHat {...props} />;
    case "cashier":     return <CreditCard {...props} />;
    case "column":      return <CircleIcon {...props} />;
    case "stairs":      return <ArrowUpDown {...props} />;
    case "bathroom":    return <Toilet {...props} />;
    case "bathroom_m":  return <User {...props} />;
    case "bathroom_f":  return <UserRound {...props} />;
    case "plant":       return <Leaf {...props} />;
    case "text_label":  return <Type {...props} />;
    default:            return null;
  }
}

interface StatPillProps {
  label: string;
  value: number | string;
}

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl px-4 py-2"
      style={{ background: "#fff2e2" }}>
      <span className="text-xl font-black tabular-nums" style={{ color: "#bb0005", fontFamily: "var(--font-epilogue, serif)" }}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest" style={{ color: "#9a7a5a" }}>
        {label}
      </span>
    </div>
  );
}
