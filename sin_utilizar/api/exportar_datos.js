// Script para exportar datos de la API y guardarlos localmente
// Uso: node exportar_datos.js

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://localhost:3000/api/exportar/todo';
const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

console.log('📦 Exportando datos de la base de datos...');

function httpGet(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function exportar() {
    try {
        console.log('🔄 Conectando a la API...');
        const datos = await httpGet(API_URL);

        console.log('📊 Estadísticas:');
        console.log(`   - Fajas Marginales: ${datos.estadisticas.fajas_marginales}`);
        console.log(`   - Hitos: ${datos.estadisticas.hitos}`);
        console.log(`   - Autorizaciones: ${datos.estadisticas.autorizaciones}`);
        console.log(`   - Derechos: ${datos.estadisticas.derechos}`);

        // Asegurar que existe el directorio
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Guardar cada capa
        const archivos = ['faja_poligono', 'faja_hito', 'uso_temporal', 'rada_por_fuente', 'rada_por_derecho'];

        archivos.forEach(nombre => {
            const contenido = `var ${nombre} = ${JSON.stringify(datos[nombre], null, 0)};`;
            const archivo = path.join(OUTPUT_DIR, `${nombre}.js`);
            fs.writeFileSync(archivo, contenido);
            console.log(`✅ Guardado: ${archivo}`);
        });

        // Guardar metadata
        const metadata = {
            version: datos.version,
            fecha_exportacion: datos.fecha_exportacion,
            estadisticas: datos.estadisticas
        };
        fs.writeFileSync(path.join(OUTPUT_DIR, '_metadata.json'), JSON.stringify(metadata, null, 2));

        console.log('\n🎉 Exportación completada!');
        console.log('📁 Los archivos están en:', OUTPUT_DIR);
        console.log('\n📝 Para actualizar el visor:');
        console.log('   1. Copia los archivos .js a la carpeta geojson/ del visor');
        console.log('   2. El visor funcionará offline con estos datos');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('\n⚠️ Verifica que:');
        console.log('   1. El servidor API esté corriendo (node server.js)');
        console.log('   2. La base de datos esté conectada');
    }
}

exportar();