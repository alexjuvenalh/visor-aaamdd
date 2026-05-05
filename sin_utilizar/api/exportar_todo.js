// Script completo: exportar todas las capas
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

const endpoints = [
    { url: '/api/poligonos-faja', name: 'faja_poligono' },
    { url: '/api/hitos-faja', name: 'faja_hito' },
    { url: '/api/poligonos-autorizacion', name: 'uso_temporal' }
];

console.log('🚀 Iniciando servidor API...');
const server = spawn('node', ['server.js'], { stdio: 'pipe' });

server.stdout.on('data', (data) => {
    const str = data.toString();
    console.log(str);
    if (str.includes('corriendo en http://localhost:3000')) {
        setTimeout(() => exportarTodo(), 1500);
    }
});

server.stderr.on('data', (data) => console.error('Err:', data.toString()));

async function exportarTodo() {
    const resultados = {};

    for (const ep of endpoints) {
        console.log(`📦 Exportando ${ep.name}...`);
        try {
            const data = await fetchUrl(`http://localhost:3000${ep.url}`);
            resultados[ep.name] = data;
            console.log(`   ✅ ${data.features?.length || 0} elementos`);
        } catch (e) {
            console.log(`   ❌ Error: ${e.message}`);
            resultados[ep.name] = { type: 'FeatureCollection', features: [] };
        }
    }

    // Guardar archivos
    console.log('\n💾 Guardando archivos...');
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    Object.keys(resultados).forEach(nombre => {
        const contenido = `var ${nombre} = ${JSON.stringify(resultados[nombre], null, 0)};`;
        fs.writeFileSync(path.join(OUTPUT_DIR, `${nombre}.js`), contenido);
        console.log(`   ✅ ${nombre}.js`);
    });

    // Metadata
    const metadata = {
        version: '1.0',
        fecha_exportacion: new Date().toISOString(),
        estadisticas: {
            fajas_marginales: resultados.faja_poligono?.features?.length || 0,
            hitos: resultados.faja_hito?.features?.length || 0,
            autorizaciones: resultados.uso_temporal?.features?.length || 0
        }
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, '_metadata.json'), JSON.stringify(metadata, null, 2));

    console.log('\n🎉 Exportación completada!');
    console.log('\n📊 Resumen:');
    console.log(`   - Fajas Marginales: ${metadata.estadisticas.fajas_marginales}`);
    console.log(`   - Hitos: ${metadata.estadisticas.hitos}`);
    console.log(`   - Autorizaciones: ${metadata.estadisticas.autorizaciones}`);

    server.kill();
    process.exit(0);
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

setTimeout(() => { console.log('⏰ Timeout'); server.kill(); process.exit(1); }, 60000);