# Smart TV Zero-Touch Deployment — Propuesta

> Cómo eliminar los pasos manuales de configuración (encender TV, abrir
> navegador, escribir URL, emparejar) en cada nueva pantalla del restaurante.
>
> Resultado: el dueño/manager puede pedir un dispositivo, conectarlo, y la
> TV empieza a mostrar publicidad sin tocar el control remoto.

---

## TL;DR

**No existe una forma de "tomar control" del navegador interno de un Smart TV consumer (Samsung/LG/Sony) de forma remota** — sus sistemas operativos están deliberadamente cerrados al público. Lo que SÍ existe es:

1. **Pre-configurar un dispositivo conectado vía HDMI** (Android TV box, Raspberry Pi, BrightSign) que arranca solo y carga nuestra URL.
2. **Usar el modo "URL Launcher" nativo** de los displays comerciales Samsung Tizen / LG WebOS Pro.
3. **Mejoras del lado nuestro** que reducen el dolor de los pasos manuales aún si se usa el navegador del Smart TV consumer.

La solución óptima coste/beneficio para Los Portillos es **#1 con un Android TV box de ~$30-40 + Fully Kiosk Browser**.

---

## El problema

Hoy el flujo de setup de una TV es:

1. Encender la TV (control remoto, manual)
2. Buscar el navegador (Smart TV browser, generalmente difícil de encontrar en la home)
3. Escribir `https://...../tv` con el control remoto (lento, error-prone)
4. Esperar el código de 4 dígitos
5. Otra persona en otra computadora valida el código en el panel admin
6. Listo

Cada paso **agrega fricción y posibilidad de error**. Multiplicado por N pantallas, es horas de trabajo cada vez que se suma una TV o se reemplaza un equipo.

---

## Por qué los Smart TVs consumer son hostiles a esto

La investigación lo confirma:

- **Los navegadores de Smart TVs (Tizen, WebOS, Vidaa, LG NetCast)** están basados en Chromium viejo, no soportan auto-launch al booteo, no tienen API pública para inyectar URLs ni cookies remotamente, y muchos hacen reset de cache después de horas inactivos. _([Samsung Tizen Specs](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html), [ScreenCloud limitations](https://help.screencloud.com/en/articles/10115418-why-certain-apps-can-not-display-on-older-samsung-tizen-lg-webos-signage-and-brightsign-models))_
- Los modos "Hospitality" / "Hotel" / "Pro:Idiom" que SÍ soportan URL Launcher solo vienen en displays comerciales (no consumer) que cuestan **5-10x más** que un televisor normal.
- **No existe un protocolo estándar** equivalente a Wake-on-LAN o ChromeCast para "empujar" una URL a un TV. Lo más cercano (HDMI-CEC) controla el encendido del TV pero no su software interno.

Conclusión: no es nuestro código el que falla — es que el navegador del Smart TV no es la herramienta correcta para signage 24/7. **La industria entera ha llegado a la misma conclusión**: usar dispositivos externos.

---

## Tres caminos (ordenados por ROI)

### CAMINO A — Quick wins **sin** cambiar hardware (mejoras a nuestro lado)

Estas reducen el dolor pero no eliminan los pasos manuales por completo.

#### A1. Pre-provisioning con token-en-URL — **HACER YA**

**Problema que resuelve:** elimina los pasos 4 y 5 del flujo (esperar código, validarlo desde admin).

**Cómo funciona:**
1. Admin abre `/admin/tv/displays/new-prepaired` y escribe el nombre ("TV Barra").
2. El sistema crea el `tvDisplay` con un token nuevo Y le devuelve una URL única tipo:
   ```
   https://restaurante.com/tv?token=tv_a1b2c3d4e5f6...
   ```
3. Admin pega esa URL una sola vez en el navegador de la TV. **Listo, sin código de 4 dígitos.**
4. La URL se puede convertir en QR para evitar tipear: el manager escanea con su celular en el panel admin → recibe la URL corta → la abre en la TV via NFC / Bluetooth / "Compartir con TV" / TV remote browser que escanea QR.

**Beneficio extra:** la URL se puede guardar como **bookmark de la home del Smart TV**, y a partir de ahí abrir el bookmark es UN click del control remoto (2-3 segundos, no 60).

**Esfuerzo:** 1 día.

**Cambio en nuestro código:**
- `TvController.tsx`: leer `?token=` del URL, si existe guardarlo en `localStorage` y saltarse pairing.
- Nuevo endpoint `POST /api/admin/tv/displays/preprovision` que crea el display + retorna la URL.
- Nueva pantalla admin con el QR + URL copiable.

#### A2. PWA install para "Apps" home-screen tile

**Cómo funciona:**
- Volver `/tv` instalable como PWA (manifest.json, service worker básico).
- En Android TV: Chrome muestra "Install app" → aparece como tile en la home, se abre con un click.
- En Samsung Tizen / LG WebOS: limitado, pero la URL del bookmark queda accesible como "favorito".

**Beneficio:** una vez instalado, abrir la app es UN click de la home, sin pasar por el navegador.

**Esfuerzo:** 0.5 días — agregar `manifest.webmanifest` específico para `/tv` (separado del PWA del cliente).

#### A3. Auto-recovery + watchdog (ya en el roadmap general — sprint 1)

Si el navegador se cuelga, hace reload solo. Si la TV se apaga y se prende, vuelve al último estado. Reduce visitas físicas para "reiniciar la TV".

---

### CAMINO B — Android TV box + kiosk browser ⭐ **RECOMENDADO**

**Esta es la solución estándar de la industria** ([Yodeck](https://www.yodeck.com/use-cases/android-digital-signage/), [OptiSigns](https://www.optisigns.com/post/using-an-android-device-for-digital-signage), [ScaleFusion](https://blog.scalefusion.com/push-content-remotely-to-android-tv-box/), [AirDroid](https://www.airdroid.com/mdm/android-tv-kiosk-mode/)). Combina costo bajo con automatización completa.

#### Hardware

Cualquiera de estos sirve, ordenados por valor:

| Dispositivo | Precio aprox | Notas |
|---|---|---|
| **Onn 4K Pro Streaming Box** (Walmart) | $50 | Android TV oficial, certificado, recomendado por OptiSigns 2026 |
| **Xiaomi Mi Box S 2nd Gen** | $50-60 | Android TV, popular para signage |
| **TCL Google TV Stick** | $30 | Más barato, suficiente para 1080p |
| **Raspberry Pi 4 + microSD + caja** | $80-100 | Más control, requiere Linux |

Cualquier TV con HDMI sirve — **no hace falta que sea Smart TV**. Esto es importante porque podés usar TVs viejos, monitores, o TVs comerciales sin browser.

#### Software: Fully Kiosk Browser

[Fully Kiosk Browser](https://www.fully-kiosk.com/en/) es la solución estándar de la industria ($7 lifetime, gratis con limitaciones):

- **Launch on Boot**: arranca solo cuando se enciende la box.
- **Lock-to-URL**: no se puede salir, pasa a fullscreen automático.
- **Auto-reload on crash**: si Chrome se cae, recarga solo.
- **Remote Admin via Fully Cloud**: desde una web, ves el estado de cada TV, mandás reload remoto, ves screenshots, cambiás URL.
- **Wake on schedule**: prende a las 7 AM, apaga a las 11 PM.
- **HDMI-CEC**: usa el cable HDMI para encender/apagar la TV cuando arranca/duerme la box.

#### Flujo "zero-touch" con esta combinación

1. **Admin crea el display** en `/admin/tv/displays/new-prepaired` (igual que A1) → recibe URL con token.
2. **Manager (en oficina, no en restaurante)**:
   - Saca el Android box de la caja
   - Lo conecta a wifi/ethernet
   - Instala Fully Kiosk Browser (Play Store, 1 minuto)
   - Pega la URL pre-paired en Fully → activa "Launch on boot" + "Kiosk mode"
   - Empaca y manda al restaurante
3. **En el restaurante**: alguien conecta el HDMI a la TV y la corriente al box. **No toca nada más.**
4. La box arranca → Fully arranca → carga la URL → la TV ya está mostrando publicidad.
5. Si se va la luz: cuando vuelve, el box arranca solo, Fully arranca solo, todo vuelve sin intervención.

#### Encendido/apagado de la TV vía HDMI-CEC

[HDMI-CEC](https://en.wikipedia.org/wiki/Consumer_Electronics_Control) permite que un dispositivo conectado por HDMI prenda/apague la TV. Casi todos los Smart TVs lo soportan (con nombres distintos: Samsung Anynet+, LG SimpLink, Sony BRAVIA Sync, Panasonic VIERA Link). Hay que activarlo en el menú de la TV una vez.

Configuración recomendada: programar el Android TV box para apagarse a las 11 PM y encenderse a las 7 AM. CEC propaga ese power-on/off a la TV. **La TV se apaga sola de noche**, ahorra energía, alarga vida del panel, y se prende sola para el servicio del día siguiente.

#### Costo total por TV

| Item | Precio |
|---|---|
| Android TV box (Onn 4K Pro) | $50 |
| Fully Kiosk Browser (lifetime) | $7-12 |
| Cable HDMI | $5 |
| **Total por TV** | **~$60-70** |

Al lado del precio de un buen Smart TV ($300-800), agregar $60 para que **funcione 24/7 sin intervención** es trivial. Cualquier TV viejo que tengan en bodega también sirve.

---

### CAMINO C — Display comercial con URL Launcher nativo

**Opcional, solo si el restaurante quiere algo "premium" o ya tiene un display comercial.**

Samsung Smart Signage Platform (SSSP) y LG webOS Pro:Idiom incluyen un modo llamado **URL Launcher** que arranca una URL al booteo sin necesidad de hardware extra. Configuración:

1. Encender la TV con el control de Smart Signage (no el de TV consumer).
2. Menú → System → Play Via → cambiar de "MagicINFO" a "URL Launcher".
3. Pegar la URL pre-paired (`https://restaurante.com/tv?token=...`).
4. Listo. Reinicia la TV, arranca solo en esa URL.

_([Guía Samsung MagicINFO → URL Launcher](https://easysignage.com/how-to/tech-faq/how-to-switch-from-magicinfo-to-url-launcher/))_

**Pros:** sin hardware extra, certificado para 24/7.
**Contras:** las TVs comerciales cuestan **$800-2000+**. Para un restaurante con 2-5 pantallas, comprar un Android TV box por TV es ~10-20x más barato que comprar displays comerciales.

**Recomendación: solo si ya tienen displays comerciales o si quieren expandir a 10+ pantallas en una segunda fase.**

---

## Recomendación específica para Los Portillos

### Fase 1 (próxima semana) — Software-only

Implementar **A1 (token-en-URL)** y **A2 (PWA)** en el código. Esto:
- Elimina los pasos 4 y 5 del flujo manual
- No cuesta nada más que el desarrollo (1.5 días)
- Beneficia incluso si después se usa Camino B

### Fase 2 (ya con Camino A funcionando) — Comprar 1 Android box piloto

- $50 + $7 de Fully Kiosk Browser
- Probar el flujo completo en una TV
- Documentar setup paso-a-paso (con screenshots) para el manager
- Si funciona como esperamos, replicar en todas las TVs

### Fase 3 (cuando crezca a 5+ TVs) — Agregar gestión centralizada

Si llegan a operar 5+ pantallas, vale la pena pagar:
- **Fully Cloud EMM** ($1.50/mes/dispositivo) — gestión remota: ver screenshots, mandar reload, cambiar URL
- O construir nuestro propio **endpoint de remote control** que aproveche el polling existente:
  - Admin marca "TV X necesita reload" → próximo poll incluye `reload: true` → TV hace `window.location.reload()`
  - Admin marca "rotar a TV Y" → próximo poll cambia orientación → TV aplica
  - **Esto ya está parcialmente diseñado en el roadmap general** (sección 3.2 Watchdog & auto-recovery)

---

## Lo que NO se puede hacer (ojo con vendedores que prometen esto)

- **No se puede "hackear" el navegador interno de un Smart TV consumer** para forzarle una URL desde la red. Las APIs no existen.
- **No existe Wake-on-LAN universal para Smart TVs**. Algunos Samsung soportan WoL Pro pero requieren config en menú escondido y solo funcionan dentro de la red local. No es confiable para producción.
- **No hay forma de "appear como app" en la home de un Tizen/WebOS sin pagar la licencia de Smart Signage Platform** (cuesta $1000s al año).
- **Chromecast / AirPlay no sirven** para signage continuo — están diseñados para sesiones cortas e interactivas, se desconectan después de inactividad.

Cualquier solución que prometa "control remoto del Smart TV" sin un dispositivo HDMI extra está usando alguno de los workarounds frágiles arriba O requiere un display comercial caro.

---

## Cambios concretos que requeriría implementar (Camino A)

### Backend
- `POST /api/admin/tv/displays/preprovision` — crea un `tvDisplay` directamente sin pasar por `tvPairingSessions`. Retorna `{ id, name, displayToken, launchUrl }`.
- Migración: ningún cambio de schema necesario (ya tenemos `displayToken`).

### Frontend admin
- Nueva página `/admin/tv/displays/preprovision` con:
  - Input de nombre
  - Botón "Generar URL"
  - QR code grande de la URL
  - Botón "Copiar URL"
  - Instrucciones paso-a-paso ("1. Abrir el navegador del TV. 2. Escribir esta URL: ... O escanear este QR con el control remoto si lo soporta...")
- Botón en `/admin/tv/displays` arriba: "Pre-emparejar (con URL/QR)" como alternativa al "Emparejar con código".

### Frontend `/tv`
- En `TvController.tsx`, en el fase boot:
  ```typescript
  // 1. Preferir token de query string (pre-provisioning)
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("token");
  if (queryToken) {
    localStorage.setItem(STORAGE_KEY, queryToken);
    // limpiar la URL para que no quede el token visible
    window.history.replaceState({}, "", "/tv");
    setToken(queryToken);
    setPhase("displaying");
    return;
  }
  // 2. Fallback: token en localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  // ... resto igual ...
  ```
- Manifest PWA específico para `/tv`: `public/tv-manifest.webmanifest` con `display: "fullscreen"`, `start_url: "/tv"`, ícono.

### Documentación
- `docs/smart-tv-setup-android-box.md` — guía paso-a-paso para configurar un Android TV box con Fully Kiosk Browser y nuestra URL pre-paired.

---

## Métrica de éxito

**Antes:** instalar una nueva TV requiere 10-15 minutos de un humano técnico in-situ + un humano en el admin coordinando el código.

**Después (Camino A):** 30 segundos in-situ (encender la box, ya vino preconfigurada). El humano técnico solo entra en juego en la oficina, una sola vez, antes de despachar la box.

**Después (Camino A + B + Fully Cloud):** desde la oficina, monitoreo en vivo del estado de las pantallas, sin necesidad de viajar al restaurante para reiniciar nada salvo en caso de daño físico.

---

## Sources

- [Android TV Kiosk Mode Guide — Scalefusion](https://blog.scalefusion.com/push-content-remotely-to-android-tv-box/)
- [Android TV Kiosk Mode — AirDroid](https://www.airdroid.com/mdm/android-tv-kiosk-mode/)
- [Android Digital Signage Buyer's Guide 2025 — Fugo](https://www.fugo.ai/blog/android-digital-signage-buyers-guide/)
- [Android Digital Signage Devices — OptiSigns](https://www.optisigns.com/post/using-an-android-device-for-digital-signage)
- [Fully Kiosk Browser](https://www.fully-kiosk.com/en/)
- [Samsung Tizen URL Launcher Setup — EasySignage](https://easysignage.com/how-to/tech-faq/how-to-switch-from-magicinfo-to-url-launcher/)
- [Samsung Tizen Web Engine Specs](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)
- [Why Some Apps Don't Run on Older Smart TVs — ScreenCloud](https://help.screencloud.com/en/articles/10115418-why-certain-apps-can-not-display-on-older-samsung-tizen-lg-webos-signage-and-brightsign-models)
- [Raspberry Pi Auto-Setup for Signage — DEV.to](https://dev.to/michidk/create-a-digital-sign-using-a-raspberry-pi-automated-setup-46e2)
- [HDMI-CEC for Display Power Control — Skykit](https://support.skykit.com/docs/using-hdmi-cec-to-control-your-display)
- [HDMI-CEC Wikipedia](https://en.wikipedia.org/wiki/Consumer_Electronics_Control)
- [Running PWAs in Kiosk Mode — Scalefusion](https://blog.scalefusion.com/run-progressive-web-applications-pwa-in-kiosk-mode/)
- [Add Web Apps to Chrome Kiosks — Google](https://support.google.com/chrome/a/answer/9781496?hl=en)
- [Android Zero-Touch Enrollment — Esper](https://www.esper.io/blog/all-about-google-zte-on-esper)
- [Smart TVs for Digital Signage 2026 — OptiSigns](https://www.optisigns.com/post/smart-tv-for-digital-signage)
