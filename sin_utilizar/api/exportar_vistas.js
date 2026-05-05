const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

const outputDir = path.join(__dirname, '..', 'visor', 'geojson');

async function exportarCapa(query, nombre) {
    console.log(`Exportando ${nombre}...`);
    try {
        const result = await pool.query(query);
        
        const features = result.rows.map(row => {
            // Separar la geometría del resto de propiedades
            let geometry = null;
            const properties = {};
            
            for (const key in row) {
                if (key === 'geom_json') {
                    try {
                        geometry = JSON.parse(row[key]);
                    } catch(e) {
                        // geometry stays null
                    }
                } else {
                    properties[key] = row[key];
                }
            }
            
            if (!geometry) return null;
            
            return {
                type: 'Feature',
                properties: properties,
                geometry: geometry
            };
        }).filter(f => f !== null);

        const geojson = { type: 'FeatureCollection', features: features };
        
        const filename = path.join(outputDir, `${nombre}.js`);
        const content = `var ${nombre} = ${JSON.stringify(geojson)};`;
        
        fs.writeFileSync(filename, content);
        console.log(`   ✅ ${features.length} features guardados en ${filename}`);
    } catch(e) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function main() {
    // Faja Marginal
    await exportarCapa(`
        SELECT
            id_poligono_faja_marginal,
            ST_AsGeoJSON(geom) as geom_json,
            nombre_faja_marginal,
            margen,
            nombre_faja,
            numero_resolucion,
            fecha_resolucion,
            clase_resolucion,
            resumen,
            aaa,
            ala,
            cut,
            departamento,
            provincia,
            distrito,
            sector,
            archivo
        FROM geo.vi_faja_marginal_poligono
    `, 'faja_poligono');

    // Hitos
    await exportarCapa(`
        SELECT
            id_punto_hito,
            ST_AsGeoJSON(geom) as geom_json,
            hito,
            ancho_faja,
            este,
            norte,
            margen,
            numero_resolucion,
            fecha_resolucion,
            clase_resolucion,
            resumen,
            aaa,
            ala,
            cut,
            departamento,
            provincia,
            distrito,
            sector,
            archivo
        FROM geo.vi_faja_marginal_hito
    `, 'faja_hito');

    // Autorizaciones
    await exportarCapa(`
        SELECT
            id_poligono_aut,
            ST_AsGeoJSON(geom) as geom_json,
            area_otorgada,
            bien_asociado,
            nombre_o_razon_social,
            tipo_documento,
            numero_documento,
            numero_resolucion,
            fecha_resolucion,
            clase_resolucion,
            aaa,
            ala,
            cut,
            tipo_aut,
            area_total,
            periodo_autorizacion,
            fecha_autorizacion,
            departamento,
            provincia,
            distrito,
            sector,
            resumen,
            archivo
        FROM geo.vi_autorizacion_uso_temporal_poligono
    `, 'uso_temporal');

    console.log('✅ Exportación completada!');
    pool.end();
}

main();