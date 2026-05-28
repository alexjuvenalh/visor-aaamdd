/**
 * Script para generar archivos .js con GeoJSON desde PostgreSQL
 * 
 * Uso: node scripts/generar-geojson.js
 * 
 * Antes de usarlo:
 *   1. npm install pg
 *   2. Verificar conexión PostgreSQL abajo (CONFIG)
 *   3. Verificar nombres de vistas/tablas en TABLAS
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ============= CONFIGURACIÓN =============
// Ajusta estos valores según tu base de datos
const CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'aaamadrededios',
    user: 'postgres',
    password: 'Aut0ridad1'
};

// Vistas a exportar (en esquema geo)
const TABLAS = [
    { nombre: 'geo.vi_faja_marginal_poligono', archivo: 'faja_poligono.js' },
    { nombre: 'geo.vi_faja_marginal_hito', archivo: 'faja_hito.js' },
    { nombre: 'geo.vi_autorizacion_uso_temporal_poligono', archivo: 'uso_temporal.js' }
];

// Directorio de salida
const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

// ============= FUNCIONES =============

async function exportarTabla(client, nombreTabla, nombreArchivo) {
    // El nombre de variable JS se deriva del nombre del archivo (sin .js)
    const nombreVariable = nombreArchivo.replace(/\.js$/, '');
    
    console.log(`\n📦 Exportando ${nombreVariable} (${nombreTabla})...`);
    
    try {
        // Obtener registros usando ST_AsGeoJSON para la geometría
        const result = await client.query(`
            SELECT 
                *,
                ST_AsGeoJSON(geom) as geometria_json
            FROM ${nombreTabla}
        `);
        const filas = result.rows;
        
        console.log(`   ✓ ${filas.length} registros encontrados`);
        
        if (filas.length === 0) {
            console.log(`   ⚠️ No hay datos, creando archivo vacío`);
            const contenido = `var ${nombreVariable} = { type: "FeatureCollection", features: [] };`;
            fs.writeFileSync(path.join(OUTPUT_DIR, nombreArchivo), contenido, 'utf8');
            return;
        }
        
        // Convertir a GeoJSON
        const features = filas.map(fila => {
            // Usar la geometría convertida con ST_AsGeoJSON
            const geometry = fila.geometria_json ? JSON.parse(fila.geometria_json) : null;
            const propiedades = { ...fila };
            
            // Eliminar columnas de geometría de las propiedades
            delete propiedades.geometria;
            delete propiedades.geometria_json;
            delete propiedades.geom;
            delete propiedades.the_geom;
            delete propiedades.wkb_geometry;
            
            return {
                type: 'Feature',
                properties: propiedades,
                geometry: geometry
            };
        });
        
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        // Generar contenido JS con el nombre de variable CORRECTO
        const contenido = `var ${nombreVariable} = ${JSON.stringify(geojson, null, 2)};`;
        
        // Guardar archivo
        const rutaArchivo = path.join(OUTPUT_DIR, nombreArchivo);
        fs.writeFileSync(rutaArchivo, contenido, 'utf8');
        
        console.log(`   ✅ Guardado: ${nombreArchivo} (${Math.round(contenido.length / 1024)} KB)`);
        
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
    }
}

async function main() {
    console.log('='.repeat(50));
    console.log('🔄 Generador de GeoJSON desde PostgreSQL');
    console.log('='.repeat(50));
    
    // Verificar directorio de salida
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const client = new Client(CONFIG);
    
    try {
        await client.connect();
        console.log('\n✅ Conectado a PostgreSQL');
        
        // Exportar cada tabla
        for (const tabla of TABLAS) {
            await exportarTabla(client, tabla.nombre, tabla.archivo);
        }
        
        console.log('\n' + '='.repeat(50));
        console.log('🎉 ¡Completado!');
        console.log('='.repeat(50));
        console.log(`\nArchivos generados en: ${OUTPUT_DIR}`);
        console.log('\nAhora podés hacer commit de los nuevos archivos .js');
        
    } catch (error) {
        console.error('\n❌ Error de conexión:', error.message);
        console.log('\nAsegúrate de:');
        console.log('  1. PostgreSQL esté corriendo');
        console.log('  2. Los datos de conexión sean correctos');
        console.log('  3. Las tablas existan en la base de datos');
        
    } finally {
        await client.end();
    }
}

main();