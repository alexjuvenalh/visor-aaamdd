/**
 * Script para generar archivos .js desde PostgreSQL
 * 
 * Uso: node generar-geojson.js
 * 
 * Requiere: npm install pg y json2js (o usa built-in)
 * 
 * Configura las variables de conexión abajo según tu PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ============= CONFIGURACIÓN =============
// Ajusta estos valores según tu base de datos
const CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'tu_base_de_datos',    // <-- CAMBIA ESTO
    user: 'postgres',                // <-- CAMBIA ESTO
    password: 'tu_password'          // <-- CAMBIA ESTO
};

// Tablas a exportar (ajusta los nombres si son diferentes)
const TABLAS = [
    { nombre: 'faja_poligono', archivo: 'faja_poligono.js' },
    { nombre: 'faja_hito', archivo: 'faja_hito.js' },
    { nombre: 'uso_temporal', archivo: 'uso_temporal.js' }
];

// Directorio de salida
const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

// ============= FUNCIONES =============

async function exportarTabla(client, nombreTabla, nombreArchivo) {
    console.log(`\n📦 Exportando ${nombreTabla}...`);
    
    try {
        // Obtener todos los registros
        const result = await client.query(`SELECT * FROM ${nombreTabla}`);
        const filas = result.rows;
        
        console.log(`   ✓ ${filas.length} registros encontrados`);
        
        if (filas.length === 0) {
            console.log(`   ⚠️ No hay datos, creando archivo vacío`);
            const contenido = `var ${nombreTabla} = { type: "FeatureCollection", features: [] };`;
            fs.writeFileSync(path.join(OUTPUT_DIR, nombreArchivo), contenido, 'utf8');
            return;
        }
        
        // Convertir a GeoJSON
        const features = filas.map(fila => {
            // Extraer geometría (ajusta según tu estructura de columnas)
            const geometry = fila.geometria || fila.geom || fila.the_geom;
            const propiedades = { ...fila };
            
            // Eliminar columnas de geometría de las propiedades
            delete propiedades.geometria;
            delete propiedades.geom;
            delete propiedades.the_geom;
            delete propiedades.wkb_geometry;
            
            return {
                type: 'Feature',
                properties: propiedades,
                geometry: geometry  // PostgreSQL retorna esto como string o objeto
            };
        });
        
        // Convertir geometrías de string a objeto si es necesario
        features.forEach(f => {
            if (f.geometry && typeof f.geometry === 'string') {
                try {
                    f.geometry = JSON.parse(f.geometry);
                } catch (e) {
                    // No es JSON, puedeser WKB binario - intenta convertir
                    console.log(`   ⚠️ Geometría en formato no estándar`);
                }
            }
        });
        
        const geojson = {
            type: 'FeatureCollection',
            features: features
        };
        
        // Generar contenido JS
        const contenido = `var ${nombreTabla} = ${JSON.stringify(geojson, null, 2)};`;
        
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