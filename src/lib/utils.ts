import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Obfuscate phone: **** + last 4 digits */
export function obfuscatePhone(phone: string): string {
  if (phone.length < 4) return "****";
  return `****${phone.slice(-4)}`;
}

/** Mask phone number, handling null/undefined */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return "****";
  return `****${cleaned.slice(-4)}`;
}

/** Format date consistently for es-VE locale */
export function formatOrderDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-VE", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

/** Format numeric rate with Venezuelan convention */
export function formatRate(rate: string | number | null | undefined): string {
  if (!rate) return "";
  const num = typeof rate === "string" ? parseFloat(rate) : rate;
  return num.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
