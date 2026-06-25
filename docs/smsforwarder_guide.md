# Guía de Configuración: SmsForwarder (pppscn)

Esta guía explica paso a paso cómo configurar un dispositivo Android dedicado con la aplicación de código abierto **SmsForwarder (de pppscn)** para interceptar y remitir los SMS de Pago Móvil y las notificaciones Push bancarias a nuestro servidor de conciliación.

---

## 1. Descarga e Instalación

Debido a que intercepta SMS y notificaciones, Google Play Protect podría alertar sobre la instalación de la aplicación externa. Siga estas instrucciones para instalarla de forma segura:

1. **Descarga de la APK oficial:**
   * Ingrese al repositorio oficial de GitHub del autor: [pppscn/SmsForwarder/releases](https://github.com/pppscn/SmsForwarder/releases).
   * Descargue el archivo APK de la versión estable más reciente (ej. `SmsForwarder-vX.Y.Z.apk`).
2. **Cómo omitir el bloqueo de Play Protect:**
   > [!WARNING]
   > Si al intentar abrir la APK descargada, Google Play Protect bloquea la instalación:
   > 1. Presione en **"Más detalles"** o **"Detalles"** en la advertencia de Play Protect.
   > 2. Seleccione **"Instalar de todas formas"** (Install anyway).
   > 3. Si no le da la opción, vaya a la app de **Google Play Store → Presione su foto de perfil → Play Protect → Ícono de Ajustes (esquina superior derecha) → Desactive "Analizar apps con Play Protect"** temporalmente, instale la aplicación, y luego vuelva a activarlo.

---

## 2. Permisos Críticos en Android

Para que la aplicación funcione en segundo plano sin apagarse, asegúrese de configurar los siguientes permisos del sistema en Android:

* **Acceso a SMS:** Otorgue permiso para leer y recibir mensajes de texto.
* **Acceso a Notificaciones:** Conceda el permiso de lectura de notificaciones del sistema (requerido para capturar notificaciones push de apps como Mercantil, BDV, etc.).
* **Optimización de Batería:** Excluya a **SmsForwarder** del ahorro de batería. Vaya a *Ajustes de Batería de la App → Sin Restricciones*.
* **Inicio Automático / Autostart:** Active el inicio automático para que la aplicación arranque por sí sola si el teléfono se reinicia por corte de luz o batería.
* **Bloquear en Recientes:** En el menú de aplicaciones recientes de Android, mantenga presionada la tarjeta de SmsForwarder y seleccione el **ícono de candado** para evitar que el sistema la cierre para liberar memoria.

---

## 3. Configuración de los "Senders" (API Servidor Next.js)

En la aplicación SmsForwarder, configuraremos los canales de envío a donde irán los datos capturados. Para soportar tanto SMS tradicionales como notificaciones de aplicaciones bancarias, **crearemos dos remitentes separados** (cada uno con su tipo de origen correcto):

### Remitente A: Webhook para SMS
1. Vaya a **Senders** (Remitentes) → Presione **"+"**.
2. Tipo: **Webhook** (o **Web API**).
3. Complete los campos:
   * **Sender Name:** `Webhook SMS GM`
   * **Web Server URL:** `https://tu-dominio.com/api/local-notifications` *(reemplaza con tu dominio de Vercel)*
   * **Request Method:** `POST`
   * **Headers:** Nombre `X-Device-Token` y Valor `[Pegue aquí su token secreto de 32 caracteres]`
   * **Request Template (JSON):**
     ```json
     {
       "sender": "[from]",
       "message": "[org_content]",
       "source": "sms",
       "receiveTime": "[receive_time]"
     }
     ```

### Remitente B: Webhook para Notificaciones Push (Apps Bancarias)
1. Vaya a **Senders** (Remitentes) → Presione **"+"**.
2. Tipo: **Webhook** (o **Web API**).
3. Complete los campos:
   * **Sender Name:** `Webhook App GM`
   * **Web Server URL:** `https://tu-dominio.com/api/local-notifications`
   * **Request Method:** `POST`
   * **Headers:** Nombre `X-Device-Token` y Valor `[Pegue aquí su token secreto de 32 caracteres]`
   * **Request Template (JSON):**
     ```json
     {
       "sender": "[from]",
       "message": "[org_content]",
       "source": "app_notification",
       "receiveTime": "[receive_time]"
     }
     ```

---

## 4. Configuración de Reglas (Rules)

Las reglas le dicen a SmsForwarder cuáles mensajes interceptar y enviar, evitando procesar SMS personales o spam.

### Regla A: Interceptar SMS (Pago Móvil BDV, Banesco, Mercantil y Provincial)
1. Vaya a la pestaña **Rules** (Reglas) → Presione **"+"**.
2. **Trigger / Disparador:** Seleccione **SMS**.
3. **Filter Rule / Condición:**
   * En **Field**, seleccione **Phone No.**.
   * En **Type**, seleccione **Regex Match** (o *Regular Expression*).
   * En **Value**, ingrese la siguiente expresión regular para filtrar todos los remitentes bancarios oficiales:
     `^(?i)(278|0?278|24024|189|1001|bdv|mercantil|provincial|banesco|263726)$`
4. **Sender / Destinatario:** Asocie el webhook creado en el Paso 3 (`Webhook SMS GM`).
5. Guarde la regla.

### Regla B: Interceptar Notificaciones Push Bancarias (Mercantil, BDV, Provincial y Banesco)
Si desea interceptar las notificaciones push emitidas directamente por las aplicaciones bancarias en la barra de estado (para evitar el envío de SMS):
1. Vaya a **Rules** (Reglas) → Presione **"+"**.
2. **Trigger / Disparador:** Seleccione **App Notification**.
3. **Filter Rule / Condición:**
   * En **Field**, seleccione **Package Name** (o *pkgName*).
   * En **Type**, seleccione **Regex Match** (o *Regular Expression*).
   * En **Value**, ingrese la siguiente expresión regular que abarca los identificadores oficiales de las aplicaciones:
     `^(com\.bancodevenezuela\.bdvdigital|com\.mercantil\.banco\.personas|com\.mercantil\.banco\.empresas|com\.bbva\.provincial\.ve|com\.banesco\.banescovenezuela)$`
4. **Sender / Destinatario:** Asocie el webhook creado en el Paso 3 (`Webhook App GM`).
5. Guarde la regla.

---

## 5. Pruebas de Integración y Simulación

Una vez configurado:
1. **Prueba de conexión:** Dentro de la configuración del webhook en la app, presione el botón **"Test"** (Probar). Ingrese un texto ficticio (ej. `BDV: Pago Movil recibido por Bs. 150,00 de V-12345678 Cel. 04141234567 Ref: 98765432`) y verifique que el servidor devuelva una respuesta HTTP `200` o `201`.
2. **Verificación de logs:** Revise el historial de logs dentro de SmsForwarder para confirmar si las solicitudes enviadas están en estado de éxito.
