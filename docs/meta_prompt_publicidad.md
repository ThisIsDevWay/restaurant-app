Listo. Creé el meta-prompt completo en [imperative-kindling-dragon.md](C:\Users\Fabian%20Urdaneta\.claude\plans\imperative-kindling-dragon.md).

**Resumen del documento (15 secciones):**

1. **Contexto y objetivo** — qué se construye y por qué
2. **Stack técnico** del MVP existente (Next.js 15, Drizzle, NextAuth v5, Valibot, Supabase Storage, polling)
3. **Patrones de referencia de Qpilot** adaptados (código numérico 4 dígitos en vez de palabras, polling en vez de Realtime, Supabase Storage en vez de ImageKit)
4. **Esquema DB completo** — 6 tablas Drizzle (`tv_displays`, `tv_pairing_sessions`, `tv_media`, `tv_events`, `tv_event_media`, `tv_event_assignments`) con código TypeScript exacto
5. **Storage** — bucket `tv-media`, MIME permitidos, paths, política
6. **22+ rutas API** detalladas (3 públicas para la TV, ~19 admin, 1 cron)
7. **16 server actions** con `adminActionClient` + Valibot
8. **UI Admin completa** — estructura de archivos, mockup de cada página (overview, displays, media, events)
9. **Página `/tv`** — máquina de estados de pairing → display, carrusel CSS puro, manejo de orientación con rotación CSS, fullscreen + wake lock
10. **Seguridad** — token de 32 hex, rate limiting, validación archivos
11. **Orden de implementación** en 16 pasos
12. **Lista exhaustiva de archivos** nuevos y modificados
13. **Checklist E2E** — 17 puntos de verificación manual
14. **Gotchas** — 15 edge cases (concurrencia de pairing, video autoplay muted, partial unique index, cascade de eventos, etc.)
15. **Entregables esperados**

**Decisiones clave tomadas (justificadas en el doc):**
- **Código numérico 4 dígitos** en vez de palabras (más fácil con remoto Smart TV)
- **Polling 3s/5s** en vez de Supabase Realtime (consistente con el resto del MVP)
- **Carrusel CSS puro** en vez de Embla (compatibilidad con engines limitados de Smart TVs)
- **Token vía query string** para `/api/tv/content` (compatibilidad con browsers de TV)
- **Eventos con prioridad** sobre playlist default; toggle `appliesToAllDisplays` para casos como festival de pasta

Puedes pasarle el contenido completo del archivo a Gemini 3 Flash y debería poder ejecutar la implementación de principio a fin.