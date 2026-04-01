# Estado de integración: Serwist + Turbopack en Next.js 15

## Problema conocido
Actualmente existe una incompatibilidad conocida entre la última versión de Serwist y Next.js usando el bundler Turbopack en modo de producción (`next build --turbopack`).

Referencia del issue: [serwist/serwist#54](https://github.com/serwist/serwist/issues/54) o problemas en su repositorio relativos a webpack vs turbopack loaders.

## Recomendación temporal
Hasta que el issue sea corregido oficialmente en la librería Serwist, se recomienda firmemente **mantener Webpack** (el bundler por defecto de Next.js) para los builds de producción.

Para este fin:
- El comando `npm run build` o `pnpm build` sigue usando `next build` internamente (Webpack).
- El comando `npm run dev` usa Turbopack (`next dev --turbopack`) ya que el Service Worker no suele afectar de forma crítica la experiencia de desarrollo rápida.
- Se agregó el script `build:turbo` (`next build --turbopack`) en caso de que se desee probar el build con Turbopack a futuro, una vez corregida la dependencia, o cuando sea por default en Next.js 16.
