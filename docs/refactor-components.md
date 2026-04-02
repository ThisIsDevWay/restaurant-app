# Refactor Components Log

## Scope
Refactorizar 5 archivos Client Components de gran tamaño en hooks + sub-componentes.

## Resultados

| Archivo | Líneas antes | Líneas después | Reducción |
|---------|-------------|---------------|-----------|
| `DailyMenuClient.tsx` | 1164 | 168 | 85% |
| `SettingsForm.tsx` | 845 | 84 | 90% |
| `ItemDetailModal.tsx` | 797 | 131 | 84% |
| `MenuItemForm.tsx` | 775 | 147 | 81% |
| `CheckoutForm.tsx` | 608 | 115 | 81% |

## Verificación final
- ✅ `pnpm typecheck` — sin errores
- ✅ `pnpm lint src/` — 0 errores en código fuente
- ✅ `pnpm test` — 92 tests pasan (13 archivos)
- ✅ Exportaciones públicas preservadas

## Correcciones aplicadas
1. **useCartCalculation.ts**: Recibe `currentRateBsPerUsd` como parámetro explícito, incluido en TODOS los useMemo que calculan `priceBsCents`. Usa tipo `Contorno` de `ItemDetailModal.types.ts`.
2. **useCheckoutForm.test.ts**: 17 tests completados con firma real del hook — validatePhone (10 casos), lookupCustomer (found/not found), debounce (400ms), handleSubmit, phone formatting.
3. **useCheckoutSurcharges.test.ts**: 5 tests — on_site cero, take_away packaging, adicionales/bebidas, delivery fee, null orderMode.
4. **useCartCalculation.test.ts**: 7 tests — totales base, fixed contornos, dependencia rate, quantity, adicionales, radio groups.
5. **SettingsForm `as any`**: Eliminado. Se creó tipo `PaymentProvider` y se corrigió `page.tsx`.

## Archivos creados

### Tipos (5)
- `src/app/(admin)/admin/menu-del-dia/DailyMenu.types.ts`
- `src/app/(admin)/admin/settings/SettingsForm.types.ts`
- `src/components/customer/ItemDetailModal.types.ts`
- `src/components/admin/menu/MenuItemForm.types.ts`
- `src/components/public/checkout/CheckoutForm.types.ts`

### Hooks (9)
- `src/hooks/useDailyMenuState.ts`
- `src/hooks/useDailyMenuSync.ts`
- `src/hooks/useItemContornos.ts`
- `src/hooks/useSettingsForm.ts`
- `src/hooks/useItemDetailModal.ts`
- `src/hooks/useCartCalculation.ts`
- `src/hooks/useMenuItemForm.ts`
- `src/hooks/useCheckoutForm.ts`
- `src/hooks/useCheckoutSurcharges.ts`

### Sub-componentes (22)
- `src/components/shared/DateNavigator.tsx`
- `src/app/(admin)/admin/menu-del-dia/DailyMenuHeader.tsx`
- `src/app/(admin)/admin/menu-del-dia/DailyMenuPlatosTab.tsx`
- `src/app/(admin)/admin/menu-del-dia/DailyMenuSimpleTab.tsx`
- `src/app/(admin)/admin/menu-del-dia/CatalogItemRow.tsx`
- `src/app/(admin)/admin/menu-del-dia/ActiveItemRow.tsx`
- `src/app/(admin)/admin/settings/SettingsGeneralTab.tsx`
- `src/app/(admin)/admin/settings/SettingsOperationTab.tsx`
- `src/app/(admin)/admin/settings/SettingsPaymentsTab.tsx`
- `src/app/(admin)/admin/settings/SettingsMessagingTab.tsx`
- `src/app/(admin)/admin/settings/SettingsSaveBar.tsx`
- `src/components/customer/ContornoSelector.tsx`
- `src/components/customer/AdicionalesList.tsx`
- `src/components/customer/BebidasList.tsx`
- `src/components/customer/OptionGroupSection.tsx`
- `src/components/customer/ModalFooter.tsx`
- `src/components/admin/menu/MenuItemImageUpload.tsx`
- `src/components/admin/menu/MenuItemPriceSection.tsx`
- `src/components/admin/menu/ContornosSection.tsx`
- `src/components/admin/menu/AdicionalesSection.tsx`
- `src/components/admin/menu/BebidasSection.tsx`
- `src/components/public/checkout/OrderModeSelector.tsx`
- `src/components/public/checkout/OrderSummary.tsx`
- `src/components/public/checkout/PaymentMethodSelector.tsx`
- `src/components/public/checkout/CheckoutStickyFooter.tsx`

### Tests (3)
- `tests/unit/hooks/useCartCalculation.test.ts` (7 tests)
- `tests/unit/hooks/useCheckoutForm.test.ts` (17 tests)
- `tests/unit/hooks/useCheckoutSurcharges.test.ts` (5 tests)

### Archivos modificados (6)
- `src/app/(admin)/admin/menu-del-dia/DailyMenuClient.tsx` — 1164 → 168 líneas
- `src/app/(admin)/admin/settings/SettingsForm.tsx` — 845 → 84 líneas
- `src/app/(admin)/admin/settings/page.tsx` — fix PaymentProvider type cast
- `src/components/customer/ItemDetailModal.tsx` — 797 → 131 líneas
- `src/components/admin/menu/MenuItemForm.tsx` — 775 → 147 líneas
- `src/components/public/checkout/CheckoutForm.tsx` — 608 → 115 líneas
