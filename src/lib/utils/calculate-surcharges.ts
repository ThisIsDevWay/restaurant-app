/**
 * Funcion pura para calcular cargos adicionales (surcharges) de un pedido.
 *
 * SIN "use client" — importable tanto en servidor (order.service.ts)
 * como en cliente (useCheckoutSurcharges.ts).
 *
 * Single source of truth para el calculo de packaging y delivery fees.
 */

// ============================================================================
// Interfaces publicas
// ============================================================================

/** Item minimo necesario para calcular surcharges */
export interface SurchargeItem {
  categoryIsSimple: boolean;
  categoryName: string;
  quantity: number;
  selectedAdicionales: Array<{ quantity?: number; substitutesComponentId?: string }>;
  selectedBebidas?: Array<{ quantity?: number }>;
}

/** Settings necesarios para el calculo (se leen de DB en server, de form en client) */
export interface SurchargeSettings {
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  deliveryFeeUsdCents: number;
}

/** Resultado del calculo de surcharges */
export interface SurchargeResult {
  plateCount: number;
  adicionalCount: number;
  bebidaCount: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  totalSurchargeUsdCents: number;
}

/** Snapshot completo para auditoria — incluye los fees unitarios del momento */
export interface SurchargesSnapshot {
  plateCount: number;
  adicionalCount: number;
  bebidaCount: number;
  packagingFeePerPlateUsdCents: number;
  packagingFeePerAdicionalUsdCents: number;
  packagingFeePerBebidaUsdCents: number;
  packagingUsdCents: number;
  deliveryFeeUsdCents: number;
  deliveryUsdCents: number;
  orderMode: string;
}

// ============================================================================
// Funcion principal
// ============================================================================

/**
 * Calcula los cargos adicionales (packaging + delivery) para un pedido.
 *
 * Reglas de negocio:
 * - Modo "on_site" o null: sin cargos
 * - Modo "take_away": solo packaging
 * - Modo "delivery": packaging + delivery
 * - Items simples (isSimple=true) se cuentan como adicionales o bebidas
 *   segun el nombre de la categoria (contiene "bebida")
 * - Platos principales cuentan sus sub-items (adicionales, bebidas)
 */
export function calculateSurcharges(
  items: SurchargeItem[],
  orderMode: string | null,
  settings: SurchargeSettings,
): SurchargeResult {
  // On-site orders have no surcharges
  if (!orderMode || orderMode === "on_site") {
    return {
      plateCount: 0,
      adicionalCount: 0,
      bebidaCount: 0,
      packagingUsdCents: 0,
      deliveryUsdCents: 0,
      totalSurchargeUsdCents: 0,
    };
  }

  let plateCount = 0;
  let adicionalCount = 0;
  let bebidaCount = 0;

  for (const item of items) {
    if (item.categoryIsSimple) {
      // Simple items (accessories/drinks) ordered alone
      // Use category name to distinguish drinks — more robust than emoji
      const isDrink = item.categoryName.toLowerCase().includes("bebida");
      if (isDrink) {
        bebidaCount += item.quantity;
      } else {
        adicionalCount += item.quantity;
      }
    } else {
      // Main dishes (platos)
      plateCount += item.quantity;

      // ┌───────────────────────────────────────────────────────────────────────┐
      // │ ⚠️  NO multiplicar sub-items por item.quantity.                      │
      // │                                                                      │
      // │ Las cantidades en selectedAdicionales[].quantity y                    │
      // │ selectedBebidas[].quantity ya representan el TOTAL de unidades        │
      // │ del pedido, NO "por plato".                                          │
      // │                                                                      │
      // │ Ejemplo: 2× Tenders con 2× Papas Fritas = 2 envases de papas,       │
      // │ NO 4.  El precio ya se multiplica correctamente por plate quantity   │
      // │ en computeItemTotal (cartStore.ts).                                  │
      // │                                                                      │
      // │ Bug histórico: multiplicar aquí por item.quantity duplicaba los       │
      // │ conteos de empaquetado.  NO reintroducir.                            │
      // └───────────────────────────────────────────────────────────────────────┘
      const pureAdicionales = item.selectedAdicionales.filter(a => !a.substitutesComponentId);
      adicionalCount +=
        pureAdicionales.reduce((sum, a) => sum + (a.quantity ?? 1), 0);
      bebidaCount +=
        (item.selectedBebidas ?? []).reduce((sum, b) => sum + (b.quantity ?? 1), 0);
    }
  }

  const packagingUsdCents =
    plateCount * settings.packagingFeePerPlateUsdCents +
    adicionalCount * settings.packagingFeePerAdicionalUsdCents +
    bebidaCount * settings.packagingFeePerBebidaUsdCents;

  const deliveryUsdCents = orderMode === "delivery" ? settings.deliveryFeeUsdCents : 0;

  return {
    plateCount,
    adicionalCount,
    bebidaCount,
    packagingUsdCents,
    deliveryUsdCents,
    totalSurchargeUsdCents: packagingUsdCents + deliveryUsdCents,
  };
}

/**
 * Construye un snapshot completo de surcharges para auditoria.
 * Incluye los fees unitarios configurados en el momento del checkout
 * para que sea posible reconstruir el calculo en el futuro.
 */
export function buildSurchargesSnapshot(
  surcharges: SurchargeResult,
  orderMode: string | null,
  settings: SurchargeSettings,
): SurchargesSnapshot {
  return {
    plateCount: surcharges.plateCount,
    adicionalCount: surcharges.adicionalCount,
    bebidaCount: surcharges.bebidaCount,
    packagingFeePerPlateUsdCents: settings.packagingFeePerPlateUsdCents,
    packagingFeePerAdicionalUsdCents: settings.packagingFeePerAdicionalUsdCents,
    packagingFeePerBebidaUsdCents: settings.packagingFeePerBebidaUsdCents,
    packagingUsdCents: surcharges.packagingUsdCents,
    deliveryFeeUsdCents: settings.deliveryFeeUsdCents,
    deliveryUsdCents: surcharges.deliveryUsdCents,
    orderMode: orderMode ?? "on_site",
  };
}
