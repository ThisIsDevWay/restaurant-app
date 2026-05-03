import type { KitchenOrderItem } from "@/types/kitchen.types";

export function timeSince(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ahora";
  if (minutes === 1) return "1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function getElapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

export interface ResolvedContornos {
  keptDefault: { id: string; name: string } | null;
  keptFixed: Array<{ id: string; name: string }>;
  substitutions: KitchenOrderItem["selectedAdicionales"];
  pureRemovals: KitchenOrderItem["removedComponents"];
  hasModifications: boolean;
  hasAnyContornos: boolean;
}

export function resolveContornos(item: KitchenOrderItem): ResolvedContornos {
  const substitutions = item.selectedAdicionales?.filter(a => a.substitutesComponentId) ?? [];
  const hasModifications = (item.removedComponents?.length ?? 0) > 0 || substitutions.length > 0;
  const replacedComponentIds = new Set(substitutions.map(s => s.substitutesComponentId));
  const pureRemovals = item.removedComponents?.filter(r => !replacedComponentIds.has(r.componentId)) ?? [];
  const hasFixedContornos = (item.fixedContornos?.length ?? 0) > 0;

  return {
    keptDefault: (item.selectedContorno && !item.removedComponents?.some(r => r.componentId === item.selectedContorno?.id))
      ? item.selectedContorno : null,
    keptFixed: item.fixedContornos?.filter(fc => !item.removedComponents?.some(r => r.componentId === fc.id)) ?? [],
    substitutions,
    pureRemovals,
    hasModifications,
    hasAnyContornos: !!item.selectedContorno || hasFixedContornos,
  };
}
