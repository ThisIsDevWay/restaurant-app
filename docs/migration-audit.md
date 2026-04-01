# Reporte de Auditoría de Migraciones de Base de Datos

## Estado del Journal (`_journal.json`) vs Archivos Físicos

**Migraciones registradas en el journal y con archivo físico:**
- `0000_romantic_photon`
- `0001_payment_providers`
- `0002_short_nebula`
- `0003_add_configurable_order_modes`
- `0004_supreme_nocturne`
- `0005_unusual_bruce_banner`

**Archivos físicos sin registro en el journal (duplicados de índice y extra):**

### Conflictos en índice 0002
- `0002_add_order_number.sql` (No en journal): Archivo SQL que solo contiene `ALTER TABLE "orders" ADD COLUMN "order_number"`. 
- **Conclusión**: Sus cambios ya están comprendidos dentro de la migración canónica `0002_short_nebula.sql`. Se recomienda "a) marcar para eliminar" ya que es idéntica/parcial.

### Conflictos en índice 0003
- `0003_dish_components.sql` (No en journal): Crea la tabla `dish_components`.
- **Conclusión**: El contenido es completamente distinto a la migración canónica `0003_add_configurable_order_modes.sql`. Se debe decidir humanamente si este archivo (dish_components) debería convertirse en una nueva migración (0006 o superior) o descartarse.

### Conflictos en índice 0004
- `0004_adicionales_pool.sql` (No en journal): Crea tablas de adicionales.
- **Conclusión**: Contenido distinto a `0004_supreme_nocturne.sql` (el cual añade opciones de transferencia). Requiere decisión humana sobre cómo re-secuenciar o si ya fue aplicado. NOTA: Muchas de las entidades de `0004_adicionales_pool` fueron incluidas en la mega-migración `0002_short_nebula` (como `menu_item_adicionales`). Probablemente es obsoleto.

### Conflictos en índice 0005
- `0005_contornos.sql` (No en journal): Crea tablas de contornos.
- **Conclusión**: El contenido es diferente de `0005_unusual_bruce_banner.sql`. Sin embargo, al igual que los adicionales, las tablas de contornos están incluidas en `0002_short_nebula`. Posiblemente obsoleto.

### Conflictos en índice 0009
Ambas migraciones no figuran en el journal y comparten el índice:
- `0009_add_checkout_manual_whatsapp_template.sql`: Añade template de WhatsApp.
- `0009_categories_is_simple.sql`: Configura `is_simple` en categorías.
- **Conclusión**: Los cambios descritos en estas migraciones ya parecen estar reflejados o solucionados en migraciones anteriores (por ejemplo `is_simple` ya se añade en `0002_short_nebula`). Se recomienda descartar ambas o evaluar si faltan inserciones.

### Archivos posteriores sin registro (0006 - 0011)
`0006_customers.sql`, `0007_whatsapp_templates.sql`, `0008_settings_whatsapp_url.sql`, `0010_menu_item...`, `0011_daily...`.
No figuran en el journal, y sus tablas respectivas fueron creadas en la migración `0002_short_nebula`. Evidentemente hubo un _squash_ en `0002_short_nebula` que consolidó todas estas migraciones individuales, pero los archivos antiguos se quedaron sin borrar. 
Se sugiere eliminar todos estos archivos huérfanos.

## Recomendación general
Se requiere aprobación humana para procesar la eliminación masiva de los archivos huérfanos desde `0002_add_order_number.sql` hasta la `0011...` que no cruzan con el journal. No se corrió ningún script de eliminación.
