/**
 * Convierte archivos GeoJSON .js a .json puro
 * 
 * Los archivos .js tienen formato: var nombreVariable = { ... };
 * Los convertimos a JSON puro para usar fetch() + .json()
 * que es 10-20x más rápido que cargar como <script>.
 * 
 * Opcionalmente trunca coordenadas a 6 decimales (~11cm de precisión).
 * 
 * Uso: node scripts/convertir-geojson.js [--precision 6]
 */

const fs = require('fs');
const path = require('path');

const GEOJSON_DIR = path.join(__dirname, '..', 'visor', 'geojson');
const FILES = [
    { name: 'faja_poligono', source: 'faja_poligono.js', dest: 'faja_poligono.json' },
    { name: 'faja_hito', source: 'faja_hito.js', dest: 'faja_hito.json' },
    { name: 'uso_temporal', source: 'uso_temporal.js', dest: 'uso_temporal.json' },
    { name: 'rada_fuente', source: 'rada_fuente.js', dest: 'rada_fuente.json' }
];

const PRECISION = parseInt(process.argv[process.argv.indexOf('--precision') + 1] || '6', 10);

console.log('🔧 Convirtiendo GeoJSON .js → .json (precisión: ' + PRECISION + ' decimales)');
console.log('');

let totalOriginal = 0;
let totalOptimizado = 0;

function truncarCoordenadas(geom) {
    if (!geom || !geom.coordinates) return geom;
    
    function truncar(coord) {
        if (typeof coord[0] === 'number') {
            // Es un par de coordenadas [lng, lat] o [lng, lat, alt]
            return coord.map(function(v) {
                return parseFloat(v.toFixed(PRECISION));
            });
        }
        // Es un array anidado (MultiPolygon, etc.)
        return coord.map(truncar);
    }
    
    // Clonar geometría y truncar coordenadas
    var nueva = { type: geom.type };
    if (geom.type === 'GeometryCollection') {
        nueva.geometries = geom.geometries.map(function(g) {
            return truncarCoordenadas(g);
        });
    } else {
        nueva.coordinates = truncar(geom.coordinates);
    }
    return nueva;
}

var errores = 0;
var exitosos = 0;

FILES.forEach(function(file) {
    var sourcePath = path.join(GEOJSON_DIR, file.source);
    var destPath = path.join(GEOJSON_DIR, file.dest);
    
    console.log('📄 Procesando ' + file.source + '...');
    
    // Verificar que exista
    if (!fs.existsSync(sourcePath)) {
        console.log('   ⚠️  No encontrado, saltando...');
        return;
    }
    
    // Leer contenido
    var contenido = fs.readFileSync(sourcePath, 'utf8');
    var originalSize = Buffer.byteLength(contenido, 'utf8');
    totalOriginal += originalSize;
    
    // Extraer JSON: buscar desde el primer { hasta el último }
    // Formato: var nombre = { ... };
    var jsonStart = contenido.indexOf('{');
    if (jsonStart === -1) {
        console.log('   ❌ No se pudo encontrar el inicio del JSON en ' + file.source);
        errores++;
        return;
    }
    
    // Buscar el último } que cierra el objeto principal
    // El formato es: var nombre = { ... };
    // Buscamos }; o } al final
    var buscaSemi = contenido.lastIndexOf(';');
    var jsonEnd;
    if (buscaSemi > jsonStart) {
        // Buscar la } justo antes del ;
        jsonEnd = contenido.lastIndexOf('}', buscaSemi);
    } else {
        jsonEnd = contenido.lastIndexOf('}');
    }
    
    if (jsonEnd === -1 || jsonEnd < jsonStart) {
        console.log('   ❌ No se pudo encontrar el cierre del JSON en ' + file.source);
        errores++;
        return;
    }
    
    var jsonStr = contenido.substring(jsonStart, jsonEnd + 1).trimEnd();
    
    // Validar que es JSON válido
    var geojson;
    try {
        geojson = JSON.parse(jsonStr);
    } catch (e) {
        console.log('   ❌ JSON inválido en ' + file.source + ': ' + e.message);
        errores++;
        return;
    }
    
    // Verificar estructura GeoJSON mínima
    if (!geojson.type || geojson.type !== 'FeatureCollection') {
        console.log('   ❌ No es un FeatureCollection válido en ' + file.source);
        errores++;
        return;
    }
    
    if (!geojson.features || !Array.isArray(geojson.features)) {
        console.log('   ❌ No tiene array features en ' + file.source);
        errores++;
        return;
    }
    
    var featuresAntes = geojson.features.length;
    
    // Truncar coordenadas
    geojson.features = geojson.features.map(function(feature) {
        if (feature.geometry) {
            feature.geometry = truncarCoordenadas(feature.geometry);
        }
        return feature;
    });
    
    // Escribir JSON minimizado (sin espacios)
    var output = JSON.stringify(geojson);
    fs.writeFileSync(destPath, output, 'utf8');
    
    var optimizedSize = Buffer.byteLength(output, 'utf8');
    totalOptimizado += optimizedSize;
    
    var reduccion = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
    console.log('   ✅ ' + featuresAntes + ' features → ' + file.dest);
    console.log('   📦 ' + (originalSize / 1024 / 1024).toFixed(2) + ' MB → ' + (optimizedSize / 1024 / 1024).toFixed(2) + ' MB (-' + reduccion + '%)');
    
    exitosos++;
});

console.log('');
console.log('='.repeat(50));
console.log('📊 RESUMEN:');
console.log('   Exitosos: ' + exitosos + '/' + FILES.length);
console.log('   Errores: ' + errores);
console.log('   Total original: ' + (totalOriginal / 1024 / 1024).toFixed(2) + ' MB');
console.log('   Total optimizado: ' + (totalOptimizado / 1024 / 1024).toFixed(2) + ' MB');
console.log('   Ahorro total: ' + ((totalOriginal - totalOptimizado) / 1024 / 1024).toFixed(2) + ' MB (-' + ((1 - totalOptimizado / totalOriginal) * 100).toFixed(1) + '%)');

if (errores > 0) {
    console.log('');
    console.log('⚠️  Hay errores. Revisá los mensajes arriba.');
    process.exit(1);
} else {
    console.log('');
    console.log('🎉 Todos los archivos convertidos correctamente.');
    console.log('');
    console.log('📋 Próximo paso: modificar js/cargar-datos.js para usar fetch() + .json()');
}
