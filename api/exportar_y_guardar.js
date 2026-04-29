// Script combinado: inicia servidor, exporta datos, detiene servidor
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000/api/exportar/todo';
const OUTPUT_DIR = path.join(__dirname, '..', 'visor', 'geojson');

console.log('🚀 Iniciando servidor API...');

const server = spawn('node', ['server.js'], { stdio: 'pipe' });

server.stdout.on('data', (data) => {
    console.log(data.toString());
    // Cuando el servidor dice que está listo, exportar
    if (data.toString().includes('corriendo en http://localhost:3000')) {
        console.log('\n📦 Exportando datos...');
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

                console.log('📊 Estadísticas:');
                console.log(`   - Fajas Marginales: ${datos.estadisticas.fajas_marginales}`);
                console.log(`   - Hitos: ${datos.estadisticas.hitos}`);
                console.log(`   - Autorizaciones: ${datos.estadisticas.autorizaciones}`);
                console.log(`   - Derechos: ${datos.estadisticas.derechos}`);

                // Crear directorio
                if (!fs.existsSync(OUTPUT_DIR)) {
                    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
                }

                // Guardar archivos
                const archivos = ['faja_poligono', 'faja_hito', 'uso_temporal', 'rada_por_fuente', 'rada_por_derecho'];
                archivos.forEach(nombre => {
                    const contenido = `var ${nombre} = ${JSON.stringify(datos[nombre], null, 0)};`;
                    fs.writeFileSync(path.join(OUTPUT_DIR, `${nombre}.js`), contenido);
                    console.log(`✅ ${nombre}.js`);
                });

                // Metadata
                fs.writeFileSync(path.join(OUTPUT_DIR, '_metadata.json'), JSON.stringify({
                    version: datos.version,
                    fecha_exportacion: datos.fecha_exportacion,
                    estadisticas: datos.estadisticas
                }, null, 2));

                console.log('\n🎉 Exportación completada!');
                console.log('📁 Archivos en:', OUTPUT_DIR);

                // Detener servidor
                server.kill();
                process.exit(0);
            } catch (e) {
                console.error('❌ Error parseando datos:', e.message);
                console.log('Respuesta:', data.substring(0, 500));
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

// Timeout de seguridad
setTimeout(() => {
    console.log('⏰ Timeout - deteniendo');
    server.kill();
    process.exit(1);
}, 45000);