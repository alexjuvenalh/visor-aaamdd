# Plan Maestro: Sistema de Gestión AAA Madre de Dios

> **Fecha**: 12/06/2026 — v2 (revisado)
> **Stack**: Node.js + Express + PostgreSQL 16/PostGIS + Leaflet + Vanilla JS
> **Metodología**: SDD (Spec-Driven Development) — cada módulo = un change independiente
> **Inicio**: Semana del 16/06/2026

---

## 🧠 Concepto Clave: Vistas PostgreSQL

El visor actual **NO está pegado a las tablas**. Usa vistas de PostgreSQL que agregan datos de múltiples tablas. El flujo real es:

```
Tablas PostgreSQL (geo.*)
        │
        ▼
Vistas PostgreSQL (agregan resolucion + geometrías + atributos)
        │
        ▼
scripts/generar-geojson.js (consulta las VISTAS, no las tablas)
        │
        ▼
visor/geojson/*.json
        │
        ▼
Visor AAA (web + app Android)
```

### Implicancia para el editor

- ✅ El editor escribe en las **tablas** base (INSERT/UPDATE en `geo.resolucion`, `geo.faja_marginal`, etc.)
- ✅ Las **vistas** reflejan automáticamente los nuevos datos
- ✅ `generar-geojson.js` se ejecuta y extrae de las vistas → JSON actualizados
- ✅ El visor no necesita cambios — solo regenerar los JSON

---

## 🏗️ Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIOS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Admin   │  │  Editor  │  │ Consulta │              │
│  │ (vos)    │  │ (jefe)   │  │ (otros)  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                     │
│       ▼             ▼             ▼                     │
│  ┌──────────────────────────────────────┐              │
│  │         SISTEMA DE GESTIÓN           │              │
│  │  ┌────────┐ ┌──────────┐ ┌────────┐ │              │
│  │  │ Editor │ │ Consultas│ │  PAS   │ │              │
│  │  │   de   │ │  (solo   │ │(Sanc.  │ │              │
│  │  │ Resol. │ │ lectura) │ │ Admin) │ │              │
│  │  └───┬────┘ └────┬─────┘ └───┬────┘ │              │
│  │      └───────────┼────────────┘      │              │
│  │                  ▼                   │              │
│  │           API REST (Node)            │              │
│  └──────────────────┼───────────────────┘              │
│                     │                                  │
│                     ▼                                  │
│  ┌──────────────────────────────────────┐              │
│  │     PostgreSQL 16 + PostGIS          │              │
│  │  ┌─────────┐  ┌──────────────────┐   │              │
│  │  │ TABLAS  │  │     VISTAS       │   │              │
│  │  │ (base)  │──▶│ (agregadas para  │   │              │
│  │  │ INSERT  │  │  el visor)       │   │              │
│  │  │ UPDATE  │  └────────┬─────────┘   │              │
│  │  └─────────┘           │              │              │
│  └────────────────────────┼──────────────┘              │
│                           │                             │
│                           ▼                             │
│              scripts/generar-geojson.js                 │
│                           │                             │
│                           ▼                             │
│    ┌─────────────────────────────────┐                 │
│    │  Visor AAA (web + app Android)  │                 │
│    │    visor/geojson/*.json         │                 │
│    └─────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```
--"ESTO ES MIO PARA LA PARTE GEOGRAFICA ESTA BIEN LEAFLET PERO PARA LA PARTE ALFANUMERICA PARA AHCER LOS CRUD NO SERIA BUENO UTILIZAR REACT   "
---

## 📦 Módulos (SDD Changes)

Cada módulo es un SDD change independiente, en orden de dependencia:

| # | Change | Descripción | Depende de |
|---|--------|-------------|------------|
| 1 | `auth-sistema` | Login, roles, sesiones JWT | — |
| 2 | `api-core` | API REST + conexión PostgreSQL (tablas + vistas) | — |
| 3 | `editor-resoluciones` | CRUD resoluciones + carga SHP/KML + Leaflet Draw | 1, 2 |
| 4 | `consultas` | Módulo lectura: búsquedas por clase_resolucion, CUT, filtros, estadísticas | 1, 2 |
| 5 | `modulo-pas` | Sistematizar Excel PAS → BD + tracking 3 etapas | 1, 2 |
| 6 | `visor-integracion` | Botón "Generar GeoJSON" desde vistas → visor actualizado | 3 |

---

## 🔐 Módulo 1: `auth-sistema`

### Objetivo
Control de acceso con 3 roles. El admin gestiona usuarios; editor y consulta acceden según permisos.

### Roles y permisos

| Acción | Admin | Editor | Consulta |
|--------|-------|--------|----------|
| Ver consultas y estadísticas | ✅ | ✅ | ✅ |
| Buscar por clase_resolucion | ✅ | ✅ | ✅ |
| Crear/editar resoluciones | ✅ | ✅ | ❌ |
| Subir geometrías (SHP/KML/Draw) | ✅ | ✅ | ❌ |
| Gestionar PAS | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Ejecutar generar-geojson | ✅ | ❌ | ❌ |

### Modelo de datos

```sql
CREATE TABLE geo.usuario (
    id_usuario SERIAL PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    rol VARCHAR(20) CHECK (rol IN ('admin','editor','consulta')),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT NOW()
);
```

### Endpoints
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/usuarios        (admin)
GET    /api/usuarios        (admin)
PUT    /api/usuarios/:id    (admin)
```

---

## 🔌 Módulo 2: `api-core`

### Objetivo
API REST que conecta el frontend con PostgreSQL. Lee y escribe en **tablas base**; las vistas las usa solo `generar-geojson.js`.

### Stack
- Node.js + Express
- `pg` (node-postgres) con pool de conexiones
- `jsonwebtoken` para JWT
- `multer` para upload de archivos (SHP, KML, PDF)
- `shapefile` para leer SHP
- `togeojson` para KML/KMZ (ya está en el visor)

### Endpoints

**Resoluciones** (tabla `geo.resolucion`)
```
GET    /api/resoluciones?clase=&ala=&año=&q=
GET    /api/resoluciones/:id
POST   /api/resoluciones
PUT    /api/resoluciones/:id
```

**Faja Marginal** (tablas `geo.faja_marginal` + geometrías)
```
GET    /api/faja-marginal?resolucion_id=
POST   /api/faja-marginal
PUT    /api/faja-marginal/:id
```

**Uso Temporal** (tablas `geo.autorizacion_uso_temporal` + geometrías)
```
GET    /api/uso-temporal?resolucion_id=
POST   /api/uso-temporal
PUT    /api/uso-temporal/:id
```

**OFM** (tablas `geo.ocupacion_faja_marginal` + geometrías)
```
GET    /api/ofm?resolucion_id=
POST   /api/ofm
PUT    /api/ofm/:id
```

**Derecho** (tablas `geo.derecho` + `geo.punto_derecho`)
```
GET    /api/derecho?resolucion_id=
POST   /api/derecho
PUT    /api/derecho/:id
```

**Geometrías** (genérico)
```
POST   /api/geometrias/upload     ← Subir SHP/KML/KMZ → devuelve GeoJSON
GET    /api/geometrias/:tipo/:id  ← Obtener geometría como GeoJSON
DELETE /api/geometrias/:tipo/:id
```

### Estructura del backend
```
editor/api/
├── server.js              ← Express app, CORS, rutas
├── db.js                  ← Pool PostgreSQL
├── middleware/
│   └── auth.js            ← Verifica JWT, inyecta req.usuario
├── routes/
│   ├── auth.js
│   ├── resoluciones.js
│   ├── faja-marginal.js
│   ├── uso-temporal.js
│   ├── ofm.js
│   ├── derecho.js
│   └── geometrias.js      ← Upload + parseo SHP/KML
└── uploads/               ← Temp files (gitignored)
```

---

## ✏️ Módulo 3: `editor-resoluciones`

### Objetivo
Digitalizar resoluciones desde PDF: ingresar metadatos + subir geometrías (SHP/KML principal, dibujo secundario) + asociar a la tabla que corresponda según la clase.

### Clases de Resolución

| clase_resolucion | Tabla destino | Geometrías |
|------------------|---------------|------------|
| `faja_marginal` | `geo.faja_marginal` | Polígonos, líneas, hitos (puntos) |
| `uso_temporal` | `geo.autorizacion_uso_temporal` | Polígonos, puntos |
| `ocupacion_faja` | `geo.ocupacion_faja_marginal` | Polígonos, puntos (vértices) |
| `derecho_agua` | `geo.derecho` | Puntos (con volúmenes) |

### Flujo de trabajo (asistente paso a paso)

```
PASO 1 — CLASE DE RESOLUCIÓN
  ┌──────────────────────────────────────┐
  │ ¿Qué vas a ingresar?                 │
  │  ○ Faja Marginal                     │
  │  ○ Autorización de Uso Temporal      │
  │  ○ Ocupación de Faja Marginal (OFM)  │
  │  ○ Derecho de Uso de Agua            │
  └──────────────────────────────────────┘

PASO 2 — DATOS DE LA RESOLUCIÓN (común a todas)
  │ N° Resolución: [________]  Fecha: [__/__/____]
  │ CUT: [________]  AAA: [MADRE DE DIOS]
  │ ALA: [________]  Resumen: [__________________]
  │ PDF firmado: [📎 Adjuntar] (opcional)
  │ ¿Modifica resolución anterior?: [________] (CUT o N°)

PASO 3 — ATRIBUTOS ESPECÍFICOS (según clase)
  │ FAJA: Nombre, Margen (I/D), Longitud (km)
  │ USO TEMPORAL: Área total, Área otorgada, Bien asociado, Período
  │ OFM: Área otorgada, Observación
  │ DERECHO: Tipo, Fuente, Volúmenes mensuales (Ene-Dic)

PASO 4 — GEOMETRÍAS
  ┌─────────────────────────────────────────────┐
  │  📁 SUBIR ARCHIVO (principal)               │
  │  [Seleccionar SHP] [Seleccionar KML/KMZ]    │
  │  ── previsualizar en mapa ──               │
  │                                             │
  │  ── o ──                                    │
  │                                             │
  │  ✏️ DIBUJAR EN EL MAPA (secundario)         │
  │  [Leaflet + leaflet-draw]                   │
  │  ▢ Polígono   ─── Línea   ● Punto          │
  └─────────────────────────────────────────────┘

PASO 5 — REVISAR Y GUARDAR
  │ ✅ Validación de campos obligatorios
  │ ✅ Previsualización de todo lo ingresado
  │ ✅ Confirmar → INSERT en tablas
  │ ✅ Mensaje: "Resolución guardada. Ejecutá 'Generar GeoJSON' para actualizar el visor."
```

### Campos por clase

**Faja Marginal**
```
Nombre faja, Margen (IZQUIERDA/DERECHA), Longitud (km), CUT
Geometrías: ▢ Polígono (faja), ─── Línea (margen), ● Hitos (puntos)
```

**Uso Temporal**
```
Área total (ha), Área otorgada (ha), Bien asociado, Período, Sector
Geometrías: ▢ Polígono, ● Puntos
```

**Ocupación Faja Marginal (OFM)**
```
Área otorgada (ha), Observación
Geometrías: ▢ Polígono, ● Vértices (puntos)
```

**Derecho de Uso de Agua**
```
Tipo derecho, Tipo fuente, Fuente, Volumen fuente (m³)
Volúmenes: Ene __ Feb __ Mar __ Abr __ May __ Jun __
           Jul __ Ago __ Set __ Oct __ Nov __ Dic __
Departamento, Provincia, Distrito, Zona, Datum
Coordenadas: Este __ Norte __
Geometrías: ● Punto
```

### Frontend
```
editor/
├── index.html              ← Dashboard (requiere login)
├── css/editor.css
├── js/
│   ├── app.js              ← Router SPA simple
│   ├── auth.js             ← Login/logout/perfil
│   ├── dashboard.js        ← Lista de resoluciones recientes + accesos rápidos
│   ├── form-base.js        ← Paso 1 y 2 (comunes)
│   ├── form-faja.js        ← Paso 3 específico Faja
│   ├── form-uso.js         ← Paso 3 específico Uso Temporal
│   ├── form-ofm.js         ← Paso 3 específico OFM
│   ├── form-derecho.js     ← Paso 3 específico Derecho
│   ├── mapa-editor.js      ← Paso 4: Leaflet + Draw + carga SHP/KML
│   └── revisar-guardar.js  ← Paso 5: validación y envío
```

---

## 🔍 Módulo 4: `consultas`

### Objetivo
Módulo solo lectura. Cualquier usuario logueado puede buscar, filtrar y consultar. Sin permisos de edición.

### Funcionalidades

**Búsqueda y filtros**
- 🔎 Buscador general: CUT, N° resolución, nombre, resumen (texto libre)
- 🏷️ **Filtro por `clase_resolucion`**: Faja | Uso Temporal | OFM | Derecho | Todas
- 📍 Filtro por ALA (Tambopata-Inambari, Tahuamanu-MDD, etc.)
- 📅 Filtro por año / rango de fechas
- 🔗 Filtro por estado: vigente | modificada | histórica

**Resultados**
- Tabla paginada con columnas: clase, N° resolución, CUT, ALA, fecha, resumen
- Clic en fila → vista detalle con todos los campos + mini mapa (Leaflet estático)
- Descarga de PDF original (si está adjunto)
- Exportar resultados a Excel

**Estadísticas** (dashboard de consultas)
- 📊 Resoluciones por clase (gráfico torta/barras)
- 📊 Resoluciones por año
- 📊 Resoluciones por ALA
- 📊 Total de geometrías cargadas

**Acceso**
- URL: `editor/consultas.html`
- Disponible para los 3 roles (admin, editor, consulta)
- El rol `consulta` SOLO ve esta sección, no tiene acceso al editor ni PAS

### Vista detalle (ejemplo)

```
┌─────────────────────────────────────────────┐
│  RESOLUCIÓN N° 0151-2022-ANA-AAA.MDD       │
│  Clase: Faja Marginal                       │
│  CUT: 85679-2022                            │
│  ─────────────────────────────────────────  │
│  AAA: Madre de Dios                         │
│  ALA: Tambopata - Inambari                  │
│  Fecha: 30/06/2022                          │
│  Nombre: FAJA MARGINAL RIO TAMBOPATA        │
│  Margen: IZQUIERDA                          │
│  ─────────────────────────────────────────  │
│  Resumen: APROBAR los estudios de Huella    │
│  Máxima que conforma el Estudio de          │
│  delimitación de la faja marginal...        │
│  ─────────────────────────────────────────  │
│  📄 Ver PDF original                        │
│                                               │
│  ┌─────────────────────────────┐            │
│  │                             │            │
│  │     [MAPA MINIATURA]        │            │
│  │                             │            │
│  └─────────────────────────────┘            │
└─────────────────────────────────────────────┘
```

---

## ⚖️ Módulo 5: `modulo-pas`

### Objetivo
Sistematizar el Excel `SEGUIMIENTO DE PAS AL 2025.xlsx` (92 registros) en BD con tracking de 3 etapas del Procedimiento Administrativo Sancionador.

### Estructura del Excel actual (3 etapas secuenciales)

| Etapa | Responsable | Datos |
|-------|-------------|-------|
| 1. Instrucción | ALA | CUT, Año, Doc. Infracción, Fecha, Acta, Informe Inicio, Fechas emisión/notificación/caducidad |
| 2. Sanción | AAA MDD | Documento, Fechas emisión/notificación, Secretaría, Profesional |
| 3. Apelación | TNRCH | Documento, Fecha, Secretaría, Área Legal |

### Modelo de datos

```sql
-- Expediente PAS
CREATE TABLE geo.pas (
    id_pas SERIAL PRIMARY KEY,
    id_resolucion INTEGER REFERENCES geo.resolucion(id_resolucion),
    cut VARCHAR(50),
    año INTEGER,
    ala VARCHAR(10),
    estado VARCHAR(20) CHECK (estado IN (
        'instruccion','sancion','apelacion','concluido','archivado'
    )),
    creado_por INTEGER REFERENCES geo.usuario(id_usuario),
    creado_en TIMESTAMP DEFAULT NOW(),
    actualizado_en TIMESTAMP DEFAULT NOW()
);

-- Etapa 1: Instrucción (ALA)
CREATE TABLE geo.pas_instruccion (
    id_instruccion SERIAL PRIMARY KEY,
    id_pas INTEGER REFERENCES geo.pas(id_pas) ON DELETE CASCADE,
    documento_infraccion VARCHAR(200),
    fecha_infraccion DATE,
    acta_inspeccion VARCHAR(200),
    fecha_acta DATE,
    informe_inicio_pas VARCHAR(200),
    fecha_emision DATE,
    fecha_notificacion DATE,
    fecha_caducidad DATE,
    responsable VARCHAR(100)
);

-- Etapa 2: Sanción (AAA MDD)
CREATE TABLE geo.pas_sancion (
    id_sancion SERIAL PRIMARY KEY,
    id_pas INTEGER REFERENCES geo.pas(id_pas) ON DELETE CASCADE,
    documento VARCHAR(200),
    fecha_emision DATE,
    fecha_notificacion DATE,
    secretaria VARCHAR(100),
    profesional_responsable VARCHAR(100)
);

-- Etapa 3: Apelación (TNRCH)
CREATE TABLE geo.pas_apelacion (
    id_apelacion SERIAL PRIMARY KEY,
    id_pas INTEGER REFERENCES geo.pas(id_pas) ON DELETE CASCADE,
    documento VARCHAR(200),
    fecha DATE,
    secretaria VARCHAR(100),
    area_legal VARCHAR(100)
);
```

### Funcionalidades
- 📥 **Migrar Excel**: Script `scripts/migrar-pas.js` que lee los 92 registros del Excel y los inserta en las tablas nuevas
- 📋 **Listado PAS**: Tabla con todos los expedientes, filtrable por estado, ALA, año
- 📝 **CRUD**: Crear, editar, ver detalle de expedientes PAS
- 📊 **Tracking visual**: Barra de progreso con las 3 etapas
- ⚠️ **Alertas**: Caducidades próximas (fecha_caducidad ≤ 15 días)
- 🔗 **Vinculación**: Asociar expediente PAS con resolución existente (CUT)
- 📤 **Exportar**: A Excel, igual formato que el original

### Vista de tracking
```
┌────────────────────────────────────────────┐
│  EXPEDIENTE PAS CUT: 52839                 │
│  ALA: TI  |  Año: 2025                     │
│                                            │
│  [■■■■■■■■■■] INSTRUCCIÓN (ALA)     ✅     │
│  Doc: AVTC N°0015-2025                     │
│  Emisión: 01/03/2025                       │
│  Notificación: 05/03/2025                  │
│  Caducidad: 01/09/2025 ⚠️ 15 días         │
│                                            │
│  [■■■■■■□□□□] SANCIÓN (AAA MDD)    🔄     │
│  Doc: N° XXX-2025                          │
│  Emisión: 15/04/2025                       │
│  Notificación: — pendiente —              │
│                                            │
│  [□□□□□□□□□□] APELACIÓN (TNRCH)    ⏳     │
│  — aún no iniciada —                       │
└────────────────────────────────────────────┘
```

---

## 🔄 Módulo 6: `visor-integracion`

### Objetivo
Conectar el editor con las vistas PostgreSQL y el generador GeoJSON. Un botón para el admin.

### Flujo

```
Editor → INSERT/UPDATE en tablas base
         │
         ▼ (automático: las vistas de PostgreSQL se actualizan solas)
Vistas PostgreSQL reflejan nuevos datos
         │
         ▼ (manual: botón "Generar GeoJSON" — solo admin)
node scripts/generar-geojson.js
         │  (consulta las VISTAS, extrae en el formato que el visor espera)
         ▼
visor/geojson/*.json actualizados
         │
         ▼
Visor AAA (web + app) ve los nuevos datos
```

### Funcionalidades
- 🔘 **Botón "Actualizar Visor"** en dashboard (solo visible para admin)
- 📊 Indicador: "Última actualización: 12/06/2026 16:30"
- 🔍 **Previsualizar**: Antes de generar, mostrar resumen de cambios (nuevas resoluciones, geometrías modificadas)
- 🗺️ **Vista previa**: Mapa con las nuevas geometrías resaltadas (opcional, para verificar antes de publicar)
- ⚙️ **Opciones**: Elegir qué capas regenerar (todas o solo las modificadas)
- 📱 **Nota**: Recordar que después de generar, hay que hacer `cap sync && build APK` si se quiere actualizar la app Android

---

## 🗺️ Mapa de SDD Changes

```
auth-sistema ──┐
               ├──→ editor-resoluciones ──→ visor-integracion
api-core ──────┤
               ├──→ consultas
               └──→ modulo-pas
```

Cada change sigue el ciclo SDD:
```
/sdd-new → proposal → specs → design → tasks → /sdd-apply → /sdd-verify → /sdd-archive
```

---

## 📅 Orden de implementación

| Fase | Changes | ¿Qué se logra? |
|------|---------|----------------|
| **Fase 0** | Preparar entorno | Verificar PostgreSQL 16, PostGIS, restaurar backup, verificar vistas existentes |
| **Fase 1** | `api-core` + `auth-sistema` | Backend funcionando, login con roles |
| **Fase 2** | `editor-resoluciones` | Digitalizar resoluciones con geometrías |
| **Fase 3** | `modulo-pas` | Migrar Excel + gestionar PAS |
| **Fase 4** | `consultas` | Búsquedas y estadísticas para todos los usuarios |
| **Fase 5** | `visor-integracion` | Conectar editor con visor (botón generar GeoJSON) |

---

## 📁 Estructura final del proyecto

```
visor-aaamdd/
├── index.html              ← Visor público
├── instalar.html           ← Página instalación APK
├── visor/geojson/          ← GeoJSON generados desde VISTAS
├── css/                    ← CSS compartido
├── js/                     ← JS compartido
├── jsmapa/                 ← JS del visor
├── leaflet/                ← Librería mapa
├── www/                    ← Capacitor (APK)
├── SVG/                    ← Íconos RADA
│
├── editor/                 ← 🆕 SISTEMA DE GESTIÓN
│   ├── index.html          ← Dashboard (login requerido)
│   ├── consultas.html      ← Módulo consultas
│   ├── css/
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   ├── form-base.js
│   │   ├── form-faja.js
│   │   ├── form-uso.js
│   │   ├── form-ofm.js
│   │   ├── form-derecho.js
│   │   ├── mapa-editor.js
│   │   ├── consultas.js
│   │   ├── pas.js
│   │   └── revisar-guardar.js
│   └── api/                ← Backend Node.js
│       ├── server.js
│       ├── db.js
│       ├── middleware/auth.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── resoluciones.js
│       │   ├── faja-marginal.js
│       │   ├── uso-temporal.js
│       │   ├── ofm.js
│       │   ├── derecho.js
│       │   └── geometrias.js
│       └── uploads/        ← Temp (gitignored)
│
├── scripts/
│   ├── generar-geojson.js  ← Lee VISTAS → genera JSON
│   └── migrar-pas.js       ← 🆕 Migración Excel→BD
│
├── android/                ← Capacitor Android
└── PLAN_SISTEMA_GESTION.md ← Este documento
```

---

## ⚠️ Consideraciones importantes

1. **PostGIS requerido**: Las geometrías usan tipos `geometry(Point,4326)`, `geometry(Polygon,4326)`. Verificar que PostGIS esté instalado.

2. **Las vistas son la clave**: El visor consume vistas, no tablas. El editor escribe en tablas base. Las vistas se actualizan automáticamente. Esto mantiene el desacople entre editor y visor.

3. **RADA**: No se toca la tabla `geo.rada`. Los datos RADA vienen de nivel central con formato propio. La tabla `geo.derecho` sí se puede usar para el módulo de derechos de agua.

4. **Backups**: Antes de cada change, hacer backup de PostgreSQL.

5. **SDD obligatorio**: Cada módulo arranca con `/sdd-new`, pasa por todas las fases, y se archiva con `/sdd-archive`. No se saltea ningún paso.

6. **No se escribe código hasta aprobación del plan**: Este documento es para revisión y ajuste. La implementación empieza la semana que viene.

---

*Plan v2 — 12/06/2026. Para revisión antes del inicio (semana del 16/06/2026).*
