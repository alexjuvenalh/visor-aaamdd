/**
 * exportar-capas-base.js
 * 
 * Exporta capas administrativas y ríos desde PostgreSQL → GeoJSON
 * para el Visor AAA Madre de Dios.
 * 
 * Tablas: geo.aaa, geo.ala, geo.departamento, geo.provincia,
 *         geo.distrito, geo.carta, geo.rio_principal, geo.rio
 * 
 * Uso: node scripts/exportar-capas-base.js
 * 
 * Requiere: pg (npm install pg)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

const CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'aaamadrededios',
    user: 'postgres',
    password: 'Aut0ridad1'
};

/**
 * Capas a exportar.
 * 
 * Campos que NO se exportan (internos/geom):
 *   - id_*, gid, ogc_fid, geom
 * 
 * simplify: tolerancia en grados para ST_Simplify (0 = sin simplificar).
 *   ~0.001° ≈ 111m en el ecuador, ~100m en Madre de Dios (12°S).
 *   ~0.0005° ≈ 55m — buena para ríos sin perder detalle visible a zoom 8-18.
 */
// Tolerancias de simplificación (~grados):
//   0.0005° ≈ 55m — moderado, buena calidad a zoom 12-16
//   0.001°  ≈ 111m — agresivo, bien a zoom 8-14
//   0.002°  ≈ 222m — muy agresivo, solo para capas de contexto lejano
const CAPAS = [
    {
        tabla: 'geo.aaa',
        archivo: 'aaa.json',
        simplify: 0.0005,
        desc: 'AAA — Autoridad Administrativa del Agua'
    },
    {
        tabla: 'geo.ala',
        archivo: 'ala.json',
        simplify: 0.0005,
        desc: 'ALA — Administración Local de Agua'
    },
    {
        tabla: 'geo.departamento',
        archivo: 'departamento.json',
        simplify: 0.001,
        desc: 'Departamentos'
    },
    {
        tabla: 'geo.provincia',
        archivo: 'provincia.json',
        simplify: 0.001,
        desc: 'Provincias'
    },
    {
        tabla: 'geo.distrito',
        archivo: 'distrito.json',
        simplify: 0.001,
        desc: 'Distritos'
    },
    {
        tabla: 'geo.carta',
        archivo: 'carta.json',
        simplify: 0.0005,
        desc: 'Cartas IGN'
    },
    {
        tabla: 'geo.rio_principal',
        archivo: 'rio_principal.json',
        simplify: 0.0005,
        desc: 'Ríos principales'
    },
    {
        tabla: 'geo.rio',
        archivo: 'rio.json',
        simplify: 0.001,  // ~111m — reduce drasticamente los 88k km
        desc: 'Ríos (simplificados)'
    }
];

async function exportarCapa(client, capa) {
    const { tabla, archivo, simplify, desc } = capa;
    console.log(`\n📤 ${desc} (${tabla})...`);

    // Construir query — excluir columnas geométricas e IDs internos
    const colsRes = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = '${tabla.split('.')[0]}'
          AND table_name = '${tabla.split('.')[1]}'
          AND column_name NOT IN ('geom')
          AND column_name NOT LIKE 'id_%'
          AND column_name NOT IN ('gid', 'ogc_fid')
        ORDER BY ordinal_position
    `);

    const propCols = colsRes.rows.map(r => `"${r.column_name}"`);

    let geomExpr = 'geom';
    if (simplify > 0) {
        geomExpr = `ST_SimplifyPreserveTopology(geom, ${simplify})`;
    }

    const propSelect = propCols.length > 0
        ? propCols.map(c => `'${c.replace(/"/g, '')}', ${c}`).join(', ')
        : '';

    const sql = `
        SELECT jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(
                jsonb_build_object(
                    'type', 'Feature',
                    'geometry', ST_AsGeoJSON(${geomExpr}, 6)::jsonb,
                    'properties', jsonb_build_object(${propSelect})
                )
            )
        ) AS geojson
        FROM ${tabla}
        WHERE ${geomExpr} IS NOT NULL
    `;

    const start = Date.now();
    const res = await client.query(sql);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    const geojson = res.rows[0]?.geojson;
    if (!geojson || !geojson.features) {
        console.log(`   ⚠️  Sin datos`);
        return { archivo, features: 0, sizeKB: 0 };
    }

    const n = geojson.features.length;

    // Compacto (sin pretty-print) para minimizar peso en disco y red
    const jsonStr = JSON.stringify(geojson);
    const filePath = path.join(OUT_DIR, archivo);

    fs.writeFileSync(filePath, jsonStr, 'utf8');
    const sizeKB = (Buffer.byteLength(jsonStr, 'utf8') / 1024).toFixed(1);

    console.log(`   ✅ ${n} features → ${archivo} (${sizeKB} KB, ${elapsed}s)`);
    return { archivo, features: n, sizeKB: parseFloat(sizeKB) };
}

async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  Exportar capas base → GeoJSON');
    console.log('  Destino:', OUT_DIR);
    console.log('═══════════════════════════════════════════');

    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR, { recursive: true });
    }

    const client = new Client(CONFIG);

    try {
        await client.connect();
        console.log('🔌 Conectado a PostgreSQL');

        let totalFeatures = 0;
        let totalSize = 0;

        for (const capa of CAPAS) {
            const result = await exportarCapa(client, capa);
            totalFeatures += result.features;
            totalSize += result.sizeKB;
        }

        console.log('\n═══════════════════════════════════════════');
        console.log(`  TOTAL: ${totalFeatures.toLocaleString()} features`);
        console.log(`  Peso: ${(totalSize / 1024).toFixed(1)} MB`);
        console.log('═══════════════════════════════════════════');
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
