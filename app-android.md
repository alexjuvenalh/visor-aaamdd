# 📱 App Android — Visor GIS ANA

## Requisitos

1. **Android Studio** instalado desde: https://developer.android.com/studio
2. **Samsung USB Driver** (para celulares Samsung):
   - https://developer.samsung.com/android-usb-driver
   - O buscar "Samsung USB driver for Windows" en Google

## Configurar celular Samsung

```
Ajustes → Acerca del teléfono → Información de software
→ Tocar 7 veces "Número de compilación" (activa Modo desarrollador)

Ajustes → Opciones de desarrollador
→ Activar "Depuración USB"
→ (opcional) Activar "Permitir desbloqueo OEM"

Conectar USB → En la notificación del celular
→ Seleccionar "Transferencia de archivos / Android Auto"
→ Aceptar "¿Permitir depuración USB?" en el celular
```

## Abrir proyecto en Android Studio

```bash
# En la terminal de Android Studio (NO en PowerShell):
# File → Open → seleccionar la carpeta android/
# Esperar que sincronice
# Conectar celular por USB
# Click en ▶️ Run
```

## Comandos útiles (PowerShell)

```powershell
# Verificar que adb existe
C:\Users\Administrador\AppData\Local\Android\Sdk\platform-tools\adb.exe devices

# Si no aparece el celular:
C:\Users\Administrador\AppData\Local\Android\Sdk\platform-tools\adb.exe kill-server
# Volver a conectar USB
C:\Users\Administrador\AppData\Local\Android\Sdk\platform-tools\adb.exe devices

# Actualizar web assets desde www/ a Android
cd D:\Datos\OneDrive - Autoridad Nacional del Agua\Programacion\IA\Visor\aaamdd
npm run cap:sync
```

## Estructura

```
aaamdd/
├── index.html          ← Web normal (sigue funcionando)
├── www/                ← Copia de web para la app Android
├── android/            ← Proyecto Android nativo
│   └── app/src/main/AndroidManifest.xml  ← Permisos GPS + Internet
├── capacitor.config.json  ← Config de Capacitor
└── server.js           ← Servidor web local
```

## Notas

- La web sigue funcionando con `node server.js` en el navegador
- Capacitor no modifica ningún archivo web existente
- Si se actualiza la web (index.html, css, js), correr `npm run cap:sync`
- La app necesita internet para cargar CDNs y tiles del mapa
