# Visor AAA - Madre de Dios — App Android

App Android nativa del Visor GIS ANA vía **Capacitor**.

---

## Estado Actual

| Componente | Estado |
|------------|--------|
| Web app | ✅ Funcionando (https://visor-aaamdd.render.com) |
| Android project | ✅ Generado y configurado |
| GPS nativo | ✅ Plugin Capacitor + fallback web |
| Icono personalizado | ✅ Logo ANA en todas las resoluciones |
| Splash screen | ✅ Logo + texto sobre azul oscuro |
| Nombre app | ✅ "Visor AAA - Madre de Dios" |
| GitHub | ✅ https://github.com/alexjuvenalh/visor-aaamdd |

---

## Scripts npm

```bash
npm run cap:sync    # Sincroniza www/ → Android
npm run cap:open    # Abre Android Studio  
npm run cap:build   # Build APK release
```

Ejecutar desde la raíz del proyecto.

---

## Para buildear en Android Studio

```bash
npm run cap:sync
npm run cap:open
```

Y en Android Studio:
1. File > Open > seleccionar `android/`
2. Esperar que Gradle sincronice
3. ▶️ Run (con celular conectado por USB)

---

## Release APK

```bash
cd android
./gradlew assembleRelease
```

El APK firmado se genera en:
```
android/app/build/outputs/apk/release/app-release.apk
```

Para firma (si no existe keystore):
1. Android Studio → Build → Generate Signed Bundle / APK
2. Crear nuevo keystore o usar existente

---

## Plugins Capacitor Instalados

| Plugin | Versión | Propósito |
|--------|---------|-----------|
| @capacitor/core | ^8.0.0 | Core Capacitor |
| @capacitor/cli | ^8.0.0 | CLI |
| @capacitor/android | ^8.0.0 | Plataforma Android |
| @capacitor/geolocation | ^8.2.0 | GPS nativo (app) con fallback web |

---

## Arquitectura GPS

```
gpsProvider (wrapper híbrido)
  ├── ¿Capacitor nativo? → @capacitor/geolocation (app Android)
  └── ¿Web? → navigator.geolocation (navegador)
```

El wrapper `gpsProvider` decide automáticamente qué API usar según el entorno.

Variables clave:
- `gpsProvider.isNative()` → detecta si corre en Capacitor
- `gpsProvider.getCurrentPosition(opts)` → Promise con posición
- `gpsProvider.watchPosition(opts, onSuccess, onError)` → watch ID
- `gpsProvider.clearWatch(id)` → detener tracking

---

## Permisos Android (AndroidManifest.xml)

- `INTERNET` — tiles, CDN
- `ACCESS_FINE_LOCATION` — GPS preciso
- `ACCESS_COARSE_LOCATION` — GPS aproximado  
- `ACCESS_NETWORK_STATE` — estado de red

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `capacitor.config.json` | Config Capacitor (cleartext, allowNavigation) |
| `jsmapa/index.js` | GPS provider + lógica del visor |
| `www/` | Web assets para la app |
| `android/` | Proyecto Android nativo |
| `package.json` | Scripts cap:sync, cap:open, cap:build |
| `android/keystore.properties` | Passwords del keystore (NO se commitea) |
| `instalar.html` | Página con QR + instrucciones de instalación |

---

## GitHub Release

- **URL**: https://github.com/alexjuvenalh/visor-aaamdd/releases/tag/v1.0.0
- **APK directo**: https://github.com/alexjuvenalh/visor-aaamdd/releases/download/v1.0.0/app-release.apk
- **QR + instrucciones**: abrir `instalar.html` en el navegador

---

## Seguridad del Keystore

Las passwords del keystore están en `android/keystore.properties` (gitignored).
El archivo `build.gradle` las lee desde ahí, NO están hardcodeadas.

Para buildear necesitás:
```
android/keystore.properties  (contiene storePassword, keyPassword, keyAlias, storeFile)
```

---

## Próximos Pasos (pendientes)

- [x] Generar APK release firmado (Paso 4)
- [x] Mejorar UI para mobile (Paso 5)
- [x] Seguridad — Passwords fuera del build.gradle
- [x] GitHub Release v1.0.0 con APK
- [x] QR + página de instalación
- [ ] Publicar en Play Store (requiere cuenta $25 USD)

## Mejoras UI Mobile implementadas (Paso 5)

| Mejora | Descripción |
|--------|-------------|
| **Bottom sheet** | Panel de controles se desliza desde abajo como app nativa |
| **Toggle colapsable** | Header siempre visible ("☰ Capas y herramientas"), tap para expandir/colapsar |
| **Touch targets 44px+** | Todos los botones respetan el estándar Android de tamaño mínimo táctil |
| **Animaciones suaves** | Transición cubic-bezier al abrir/cerrar el panel |
| **Inline styles eliminados** | Todos los estilos inline del HTML migrados a CSS |
| **Secciones separadas** | "Archivos" y "GPS" como secciones con título |
| **Botones de exportación GPS** | Migrados a clases CSS en vez de inline styles |

### Archivos modificados

- `index.html` — estructura bottom sheet + header toggle + clases CSS
- `css/celular.css` — reescrito completo con bottom sheet, touch targets 44px+, animaciones
- `css/estilosmapa.css` — ocultos elementos mobile-only en desktop
- `css/estilos.css` — tamaños base de botones mejorados
- `jsmapa/index.js` — función `toggleControls()`, botones dinámicos con clases CSS
