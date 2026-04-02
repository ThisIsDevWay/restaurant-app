"use client";

import { useMemo } from "react";
import type { CartItem } from "@/store/cartStore";
import type { CheckoutSettings, OrderMode } from "@/components/public/checkout/CheckoutForm.types";

export interface SurchargeResult {
  plateCount: number;
  adicionalCount: number;
  bebidaCount: number;
  packagingUsdCents: number;
  deliveryUsdCents: number;
  totalSurchargeUsdCents: number;
}

export interface UseCheckoutSurchargesParams {
  items: CartItem[];
  orderMode: OrderMode | null;
  settings: CheckoutSettings | null;
  totalBsCents: number;
  totalUsdCents: number;
}

export interface UseCheckoutSurchargesReturn {
  surcharges: SurchargeResult;
  grandTotalSurchargeBsCents: number;
  grandTotalBsCents: number;
  grandTotalUsdCents: number;
  itemCount: number;
  rate: number;
}

export function useCheckoutSurcharges({
  items,
  orderMode,
  settings,
  totalBsCents,
  totalUsdCents,
}: UseCheckoutSurchargesParams): UseCheckoutSurchargesReturn {
  const itemCount = useMemo(
    () => items.reduce((acc, i) => acc + i.quantity, 0),
    [items],
  );

  const surcharges = useMemo<SurchargeResult>(() => {
    if (!settings || !orderMode || orderMode === "on_site") {
      return { plateCount: 0, adicionalCount: 0, bebidaCount: 0, packagingUsdCents: 0, deliveryUsdCents: 0, totalSurchargeUsdCents: 0 };
    }

    let plateCount = 0;
    let adicionalCount = 0;
    let bebidaCount = 0;

    items.forEach((item) => {
      plateCount += item.quantity;
      adicionalCount += item.selectedAdicionales.length * item.quantity;
      bebidaCount += (item.selectedBebidas ?? []).length * item.quantity;
    });

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
  }, [items, orderMode, settings]);

  const rate = settings?.rate ?? 0;

  const grandTotalSurchargeBsCents = rate > 0
    ? Math.round(surcharges.totalSurchargeUsdCents * rate)
    : 0;
  const grandTotalBsCents = totalBsCents + grandTotalSurchargeBsCents;
  const grandTotalUsdCents = totalUsdCents + surcharges.totalSurchargeUsdCents;

  return {
    surcharges,
    grandTotalSurchargeBsCents,
    grandTotalBsCents,
    grandTotalUsdCents,
    itemCount,
    rate,
  };
}
