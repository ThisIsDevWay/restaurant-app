# Restaurante G y M TV — Android TV Kiosk App

App nativa para Android TV que carga `/tv` del servidor en modo kiosk fullscreen. Sin dependencias de terceros (reemplaza Fully Kiosk Browser).

## Qué hace

- **WebView fullscreen** apuntando a `https://tu-dominio.com/tv?token=tv_…`
- **Auto-lanza al encender** (BOOT_COMPLETED + QUICKBOOT_POWERON)
- **Bloquea BACK** y retoma el foco cuando se presiona HOME
- **Pantalla siempre encendida** mientras la app está en primer plano
- **Audio automático** — detecta que está en modo kiosk y desbloquea sonido sin requerir toque
- **Auto-recuperación** — recarga ante crash del render, reintenta con backoff exponencial (5s a 60s) en error de red
- **Video con aceleración hardware** (`LAYER_TYPE_HARDWARE`) — fix para `<video>` rotado en negro
- **Long-press MENU 3s** en el control para abrir la pantalla de configuración
- **Configuración remota vía ADB** para batch-configurar todas las TVs desde un laptop

## Identificadores de la app

| Campo | Valor |
|---|---|
| `applicationId` (visible en dispositivo / Play Store) | `com.restaurantgm.tv` |
| `namespace` (paquete Java interno) | `com.losportillos.tv` |
| Broadcast action | `com.restaurantgm.tv.SET_URL` |
| Broadcast component | `com.losportillos.tv/.UrlReceiver` (requerido por exported="false") |

> El namespace se actualizará cuando se complete el rebranding.

## Estructura del proyecto

```
android-tv/
├── build.gradle.kts                 # Gradle del proyecto
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts             # applicationId y DEFAULT_URL aquí
    └── src/main/
        ├── AndroidManifest.xml      # Permisos, launcher Leanback, receivers
        ├── java/com/losportillos/tv/
        │   ├── MainActivity.kt      # Host WebView + kiosk lockdown
        │   ├── ConfigActivity.kt    # Pantalla de configuración de URL
        │   ├── BootReceiver.kt      # Auto-lanzar al encender
        │   ├── UrlReceiver.kt       # Broadcast ADB para cambiar URL
        │   └── Prefs.kt             # SharedPreferences
        └── res/
            ├── layout/              # activity_main + activity_config
            ├── values/              # strings, themes, colors
            ├── drawable/            # banner (tile Android TV) + ícono
            ├── mipmap-anydpi-v26/   # Íconos adaptativos
            └── xml/                 # Network security config
```

## Requisitos

- **Android Studio Hedgehog** (2023.1) o más reciente
- **JDK 17** (incluido con Android Studio)
- **Android SDK Platform 34** + **Build Tools 34.0.0**
- **ADB** en el PATH (viene con `platform-tools` de Android Studio)
- **Gradle 8.9** (especificado en `gradle/wrapper/gradle-wrapper.properties`)

> ⚠️ No usar Gradle 9.x — incompatible con AGP 8.5.x. El wrapper ya está fijado a 8.9.

## Compilar

### 1. Abrir en Android Studio

```
File → Open → D:\restaurant-app\android-tv
```

Android Studio genera el Gradle wrapper y descarga dependencias en el primer sync (~3 min).

### 2. Configurar el dominio de producción

Editar `app/build.gradle.kts` línea 20:

```kotlin
buildConfigField("String", "DEFAULT_URL", "\"https://tu-dominio.com/tv\"")
```

### 3. Construir el APK

**Desde Android Studio:**
```
Build → Build Bundle(s) / APK(s) → Build APK(s)
```

El APK aparece en:
```
app/build/outputs/apk/release/app-release.apk
```

**Desde terminal** (requiere `JAVA_HOME` configurado):
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleRelease
```

## Desplegar en las TVs Aiwa

### Preparación por única vez (~2 min por TV)

**En cada Aiwa TV:**
1. `Ajustes → Preferencias del dispositivo → Acerca de → Compilación` — pulsa 7 veces
2. `Preferencias del dispositivo → Opciones de desarrollador` → activar **Depuración de red**
3. Anotar la IP: `Ajustes → Red → Estado`

**Desde el laptop:**
```bash
# Conectar
adb connect 192.168.1.XX:5555

# Instalar
adb -s 192.168.1.XX:5555 install app/build/outputs/apk/release/app-release.apk

# Configurar token (generar desde /admin/tv → Pre-provisionar TV)
adb -s 192.168.1.XX:5555 shell am broadcast \
    -n com.losportillos.tv/.UrlReceiver \
    -a com.restaurantgm.tv.SET_URL \
    --es url "https://tu-dominio.com/tv?token=tv_XXXXXXXX"

# Establecer como launcher del sistema (auto-lanza al encender)
adb -s 192.168.1.XX:5555 shell cmd package set-home-activity \
    com.restaurantgm.tv/.MainActivity
```

### Batch deploy — todas las TVs de una vez

Crear `tvs.txt` (una TV por línea: `IP TOKEN`):
```
192.168.1.50 tv_abc123
192.168.1.51 tv_def456
192.168.1.52 tv_ghi789
```

```bash
while read ip token; do
  echo "→ Configurando $ip..."
  adb connect "$ip:5555"
  adb -s "$ip:5555" install -r app/build/outputs/apk/release/app-release.apk
  adb -s "$ip:5555" shell am broadcast \
      -n com.losportillos.tv/.UrlReceiver \
      -a com.restaurantgm.tv.SET_URL \
      --es url "https://tu-dominio.com/tv?token=$token"
  adb -s "$ip:5555" shell cmd package set-home-activity \
      com.restaurantgm.tv/.MainActivity
  echo "✓ $ip listo"
done < tvs.txt
```

## Operaciones del día a día

### Actualizar la app en todas las TVs
```bash
adb -s 192.168.1.XX:5555 install -r app/build/outputs/apk/release/app-release.apk
```
`-r` reinstala sin borrar datos. La app reinicia automáticamente.

### Cambiar la URL / rotar token (sin reinstalar)
```bash
adb -s 192.168.1.XX:5555 shell am broadcast \
    -n com.losportillos.tv/.UrlReceiver \
    -a com.restaurantgm.tv.SET_URL \
    --es url "https://tu-dominio.com/tv?token=tv_NUEVO"
```

### Reiniciar una TV remotamente
```bash
adb -s 192.168.1.XX:5555 shell reboot
```

### Ver logs en tiempo real
```bash
adb -s 192.168.1.XX:5555 logcat -s TvKiosk:V chromium:V
```

Muestra tanto los logs de Kotlin como los `console.log` del JavaScript de Next.js.

### Configuración local desde el control
Mantener presionado **MENU** durante 3 segundos → abre la pantalla de configuración.

## Prueba en emulador (sin TV física)

### Android Studio TV Emulator (recomendado)
```
Tools → Device Manager → + → Television → Android TV (1080p) → API 34
Run → Run 'app'   (Shift+F10)
```

### Apuntar al servidor local (next dev)
```bash
# Iniciar Next.js escuchando en todas las interfaces
pnpm dev --hostname 0.0.0.0

# Configurar el emulador (10.0.2.2 = tu PC desde el emulador)
# Nota: La app ahora exige protocolo seguro https:// para configurar la URL.
adb shell am broadcast \
    -n com.losportillos.tv/.UrlReceiver \
    -a com.restaurantgm.tv.SET_URL \
    --es url "https://10.0.2.2:3000/tv"
```

### LDPlayer (validación rápida)
```bash
adb connect localhost:5555
adb -s localhost:5555 install app\build\outputs\apk\debug\app-debug.apk
adb -s localhost:5555 shell am broadcast ^
    -n com.losportillos.tv/.UrlReceiver ^
    -a com.restaurantgm.tv.SET_URL ^
    --es url "https://10.0.2.2:3000/tv"
```

## Troubleshooting

**Video en negro (pantalla rotada)**
El `LAYER_TYPE_HARDWARE` ya está aplicado. Si persiste, verificar la versión del WebView del sistema:
```bash
adb shell dumpsys package com.google.android.webview | grep versionName
```
Actualizar vía Play Store si es anterior a Chrome 90.

**TV no auto-lanza al encender**
```bash
# Verificar que set-home-activity corrió bien
adb shell dumpsys package com.restaurantgm.tv | grep -A2 "LEANBACK_LAUNCHER"
# Verificar receiver activo
adb shell dumpsys package com.restaurantgm.tv | grep BootReceiver
```

**ADB se desconecta cuando la TV entra en standby**
Volver a conectar: `adb connect 192.168.1.XX:5555`. Despertar la TV antes de ejecutar comandos.

**App vuelve a ConfigActivity en cada arranque**
El `DEFAULT_URL` en `build.gradle.kts` es el placeholder. Ejecutar el broadcast `SET_URL` o reconstruir con el dominio real.

**Error de loopback con gradlew en Windows**
Construir desde Android Studio UI en vez de la terminal, o agregar Java al firewall de Windows:
```powershell
# PowerShell como Administrador
New-NetFirewallRule -DisplayName "Gradle JVM" `
    -Direction Inbound -Action Allow -Protocol TCP `
    -LocalAddress 127.0.0.1 `
    -Program "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
```

## Limitaciones conocidas

| Feature | Esta app | Fully Kiosk |
|---|---|---|
| Sin licencia | ✅ | ❌ ~$7/dispositivo |
| Código fuente propio | ✅ | ❌ |
| Kiosk lock completo (bloquear HOME físicamente) | ⚠️ Soft lock — requiere Device Owner para lock total | ✅ |
| Dashboard remoto MQTT | ❌ (ADB es suficiente para 7 TVs) | ✅ |
| Detección de movimiento | ❌ fuera de scope | ✅ |

Para activar **Device Owner** (lock total del HOME):
```bash
# Solo en TV de fábrica recién reseteada
adb shell dpm set-device-owner com.restaurantgm.tv/.DeviceAdminReceiver
```
