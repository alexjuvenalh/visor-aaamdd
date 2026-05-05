// Script combinado: inicia servidor, exporta datos, detiene servidor
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/poligonos-faja';
const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

console.log('🚀 Iniciando servidor API...');

const server = spawn('node', ['server.js'], { stdio: 'pipe' });

server.stdout.on('data', (data) => {
    console.log(data.toString());
    if (data.toString().includes('corriendo en http://localhost:3000')) {
        console.log('\n📦 Exportando fajas marginales...');
        setTimeout(exportar, 1000);
    }
});

server.stderr.on('data', (data) => {
    console.error('Error:', data.toString());
});

function exportar() {
    const http = require('http');

    http.get(API_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            try {
                const datos = JSON.parse(data);

                if (datos.error) {
                    console.error('❌ Error de la API:', datos.error);
                    server.kill();
                    process.exit(1);
                }

                console.log('📊 Fajas marginales encontradas:', datos.features.length);

                // Crear directorio
                if (!fs.existsSync(OUTPUT_DIR)) {
                    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
                }

                // Guardar archivo
                const contenido = `var faja_poligono = ${JSON.stringify(datos, null, 0)};`;
                fs.writeFileSync(path.join(OUTPUT_DIR, 'faja_poligono.js'), contenido);
                console.log('✅ faja_poligono.js guardado');

                console.log('\n🎉 Primera exportación completada!');
                console.log('Ahora necesito exportar las otras capas también...');

                server.kill();
                process.exit(0);
            } catch (e) {
                console.error('❌ Error:', e.message);
                server.kill();
                process.exit(1);
            }
        });
    }).on('error', (e) => {
        console.error('❌ Error de conexión:', e.message);
        server.kill();
        process.exit(1);
    });
}

setTimeout(() => {
    console.log('⏰ Timeout');
    server.kill();
    process.exit(1);
}, 45000);