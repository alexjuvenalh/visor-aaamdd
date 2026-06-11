// Colores para categorización de RADA por Uso
var coloresRADA = {
    'Acuícola': 'ff00ffff',      // Cyan
    'Minero': 'ffbf00ff',        // Amarillo
    'Poblacional': 'ff0000ff',    // Rojo
    'Otros Usos': 'ff808080',    // Gris
    'Agrícola': 'ff00ff00',      // Verde
    'Doméstico - Poblacional': 'ff0080ff', // Naranja
    'Industrial': 'ff8000ff',    // Púrpura
    'Recreativo': 'ff00bf00',    // Lima
    'Pecuario': 'ff804000',      // Marrón
    'Energético': 'ff0000ff',    // Azul
    'Turístico': 'ffff00ff'      // Rosa
};

// Convertir GeoJSON a KML para RADA con categorización por Uso
function geojsonToKMLRADA(geojson) {
    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document>\n';
    kml += '  <name>RADA Fuente</name>\n';
    
    // Crear estilos para cada Uso - con círculos y letra pequeña
    var usos = {};
    geojson.features.forEach(function(f) {
        var uso = f.properties.Uso || 'Otro';
        if (!usos[uso]) usos[uso] = true;
    });
    
    for (var uso in usos) {
        var color = coloresRADA[uso] || 'ff808080';
        kml += '  <Style id="rada-' + uso.replace(/[^a-zA-Z0-9]/g, '_') + '">\n';
        // Usar icono de círculo
        kml += '    <IconStyle>\n';
        kml += '      <color>' + color + '</color>\n';
        kml += '      <scale>0.5</scale>\n';
        kml += '      <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon>\n';
        kml += '    </IconStyle>\n';
        // Letra pequeña
        kml += '    <LabelStyle><color>' + color + '</color><scale>0.5</scale></LabelStyle>\n';
        kml += '  </Style>\n';
    }
    
    geojson.features.forEach(function(feature, i) {
        var uso = feature.properties.Uso || 'Otro';
        var nombre = feature.properties.Usuario || feature.properties.Lugar_Uso || ('Punto ' + (i + 1));
        
        var styleId = 'rada-' + uso.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Solo mostrar Uso como nombre
        kml += '  <Placemark>\n';
        kml += '    <name><![CDATA[' + uso + ']]></name>\n';
        kml += '    <styleUrl>#' + styleId + '</styleUrl>\n';
        
        // Generar description solo con campos importantes
        var desc = '';
        var camposImportantes = ['Usuario', 'Documento', 'Resolució', 'Fecha', 'Fuente', 'Lugar_Uso', 'Volumen (m', 'Area (ha)', 'ALA', 'AAA', 'Departamen', 'Provincia', 'Distrito'];
        camposImportantes.forEach(function(key) {
            if (feature.properties[key]) desc += key + ': ' + feature.properties[key] + '\n';
        });
        
        // Agregar link PDF si existe
        if (feature.properties.Archivo) {
            var pdfUrl = 'https://snirh.ana.gob.pe/MIDARH/output/Resolucion/' + feature.properties.Archivo;
                if (!feature.properties.Archivo.toLowerCase().endsWith('.pdf')) pdfUrl += '.pdf';
                desc += '\n<a href="' + pdfUrl + '">📄 Ver PDF</a>';
        }
        
        kml += '    <description><![CDATA[' + desc + ']]></description>\n';
        
        if (feature.geometry.type === 'Point') {
            var coords = feature.geometry.coordinates;
            kml += '    <Point><coordinates>' + coords[0] + ',' + coords[1] + ',0</coordinates></Point>\n';
        }
        
        kml += '  </Placemark>\n';
    });
    
    kml += '</Document>\n</kml>';
    return kml;
}

// Convertir GeoJSON a KML con estilos
function geojsonToKML(geojson, nombreCapa, tipoCapa) {
    // Definir estilos según tipo de capa
    var estilos = {
        faja: { color: 'ff0000ff', colorName: 'red', fill: 0, outline: 1 },      // Rojo, solo contorno
        hito: { color: 'ff800080', colorName: 'purple', fill: 1, outline: 1 },   // Morado
        uso: { color: 'ffff0000', colorName: 'blue', fill: 0, outline: 1 }       // Azul, solo contorno
    };
    
    var estilo = estilos[tipoCapa] || estilos.faja;
    
    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
    kml += '<Document>\n';
    kml += '  <name>' + nombreCapa + '</name>\n';
    
    // Definir estilo
    kml += '  <Style id="' + tipoCapa + '">\n';
    if (geojson.features[0] && geojson.features[0].geometry.type === 'Point') {
        // Para puntos (hitos), usar icono circular
        kml += '    <IconStyle><color>' + estilo.color + '</color><scale>0.8</scale><heading>0</heading></IconStyle>\n';
        kml += '    <LabelStyle><color>' + estilo.color + '</color><scale>0.8</scale></LabelStyle>\n';
        kml += '    <BalloonStyle><text>$[name]</text></BalloonStyle>\n';
    } else {
        kml += '    <LineStyle><color>' + estilo.color + '</color><width>3</width></LineStyle>\n';
        kml += '    <PolyStyle><color>' + (estilo.fill ? estilo.color : '00000000') + '</color><outline>' + estilo.outline + '</outline></PolyStyle>\n';
    }
    kml += '  </Style>\n';
    
    // Estilo para etiqueta de resolución en uso temporal
    if (tipoCapa === 'uso') {
        kml += '  <Style id="uso-resolucion">\n';
        kml += '    <LabelStyle>\n';
        kml += '      <color>ffff0000</color>\n';
        kml += '      <scale>0.8</scale>\n';
        kml += '    </LabelStyle>\n';
        kml += '    <IconStyle>\n';
        kml += '      <color>00000000</color>\n';
        kml += '    </IconStyle>\n';
        kml += '  </Style>\n';
    }
    
    // Agregar estilo de icono para puntos
    if (geojson.features[0] && geojson.features[0].geometry.type === 'Point') {
        kml += '  <Style id="hito-icon">\n';
        kml += '    <IconStyle>\n';
        kml += '      <color>ff800080</color>\n';
        kml += '      <scale>0.6</scale>\n';
        kml += '      <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-circle.png</href></Icon>\n';
        kml += '    </IconStyle>\n';
        kml += '    <LabelStyle>\n';
        kml += '      <color>ff800080</color>\n';
        kml += '      <scale>0.8</scale>\n';
        kml += '    </LabelStyle>\n';
        kml += '  </Style>\n';
    }
    
    geojson.features.forEach(function(feature, i) {
        // Nombre según tipo de capa
        var nombre;
        if (tipoCapa === 'hito') {
            nombre = feature.properties.hito || ('Hito ' + (i + 1));
        } else if (tipoCapa === 'faja') {
            nombre = feature.properties.nombre_faja_marginal || feature.properties.nombre_faja || ('Polígono ' + (i + 1));
        } else {
            nombre = feature.properties.nombre_o_razon_social || ('Autorización ' + (i + 1));
        }
        
        kml += '  <Placemark>\n';
        kml += '    <name><![CDATA[' + nombre + ']]></name>\n';
        // Para hitos (puntos), usar estilo de círculo
        var styleRef = (tipoCapa === 'hito' && feature.geometry.type === 'Point') ? '#hito-icon' : '#' + tipoCapa;
        kml += '    <styleUrl>' + styleRef + '</styleUrl>\n';
        
        var desc = '';
        for (var key in feature.properties) {
            if (feature.properties[key]) desc += key + ': ' + feature.properties[key] + '\n';
        }
        kml += '    <description><![CDATA[' + desc + ']]></description>\n';
        
        if (feature.geometry.type === 'Point') {
            var coords = feature.geometry.coordinates;
            kml += '    <Point><coordinates>' + coords[0] + ',' + coords[1] + ',0</coordinates></Point>\n';
        } else if (feature.geometry.type === 'LineString') {
            kml += '    <LineString><coordinates>';
            feature.geometry.coordinates.forEach(function(c) { kml += c[0] + ',' + c[1] + ',0 '; });
            kml += '</coordinates></LineString>\n';
        } else if (feature.geometry.type === 'Polygon') {
            kml += '    <Polygon><outerBoundaryIs><LinearRing><coordinates>';
            feature.geometry.coordinates[0].forEach(function(c) { kml += c[0] + ',' + c[1] + ',0 '; });
            kml += '</coordinates></LinearRing></outerBoundaryIs></Polygon>\n';
        }
        
        kml += '  </Placemark>\n';
        
        // Para uso temporal, agregar etiqueta con número de resolución en el centro (como Placemark separado)
        if (tipoCapa === 'uso' && feature.geometry.type === 'Polygon' && feature.properties.numero_resolucion) {
            var ring = feature.geometry.coordinates[0];
            var sumLng = 0, sumLat = 0;
            ring.forEach(function(c) { sumLng += c[0]; sumLat += c[1]; });
            var centroLng = sumLng / ring.length;
            var centroLat = sumLat / ring.length;
            
            kml += '  <Placemark>\n';
            kml += '    <name><![CDATA[' + feature.properties.numero_resolucion + ']]></name>\n';
            kml += '    <styleUrl>#uso-resolucion</styleUrl>\n';
            kml += '    <Point><coordinates>' + centroLng + ',' + centroLat + ',0</coordinates></Point>\n';
            kml += '  </Placemark>\n';
        }
    });
    
    kml += '</Document>\n</kml>';
    return kml;
}

// Descargar como KML
function descargarCapa(capa) {
    var geojson, nombre, tipo;
    if (capa === 'faja') { geojson = window.faja_poligono; nombre = 'Faja_Marginal'; tipo = 'faja'; }
    else if (capa === 'hito') { geojson = window.faja_hito; nombre = 'Hitos_Faja'; tipo = 'hito'; }
    else if (capa === 'uso') { geojson = window.uso_temporal; nombre = 'Uso_Temporal'; tipo = 'uso'; }
    else if (capa === 'rada') { geojson = window.rada_por_fuente; nombre = 'RADA_Fuente'; tipo = 'rada'; }
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        alert('No hay datos para descargar');
        return;
    }
    
    // Si es RADA, usar función especial con categorización por Uso
    if (capa === 'rada') {
        var kml = geojsonToKMLRADA(geojson);
    } else {
        var kml = geojsonToKML(geojson, nombre, tipo);
    }
    var blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombre + '_' + Date.now() + '.kml';
    link.click();
}

// Descargar como SHP real (usa @mapbox/shp-write + JSZip)
function descargarCapaShp(capa) {
    var geojson, nombre, tipoGeo;
    if (capa === 'faja') { geojson = window.faja_poligono; nombre = 'PoligonoFajaMarginal'; tipoGeo = 'polygon'; }
    else if (capa === 'hito') { geojson = window.faja_hito; nombre = 'HitosFajaMarginal'; tipoGeo = 'point'; }
    else if (capa === 'uso') { geojson = window.uso_temporal; nombre = 'AUT'; tipoGeo = 'polygon'; }
    else if (capa === 'rada') { geojson = window.rada_por_fuente; nombre = 'RADA'; tipoGeo = 'point'; }
    
    if (!geojson || !geojson.features || geojson.features.length === 0) {
        alert('No hay datos para descargar');
        return;
    }
    
    // Intentar generar SHP real con shp-write
    if (typeof shpwrite !== 'undefined' && typeof shpwrite.zip === 'function') {
        try {
            // Los .shp, .shx, .dbf, .prj internos usan el nombre de la capa
            var tipos = {};
            tipos[tipoGeo] = nombre;
            
            var opciones = {
                folder: nombre,
                filename: nombre + '_' + Date.now(),
                outputType: 'blob',
                compression: 'STORE',
                types: tipos
            };
            
            var resultado = shpwrite.zip(geojson, opciones);
            
            function descargarBlob(blob) {
                var link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = nombre + '_' + Date.now() + '.zip';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(function() { URL.revokeObjectURL(link.href); }, 10000);
            }
            
            // shpwrite.zip puede devolver blob directo o Promise
            if (resultado && typeof resultado.then === 'function') {
                resultado.then(descargarBlob).catch(function(err) {
                    console.error('Error generando SHP:', err);
                    descargarComoGeoJSON(geojson, nombre);
                });
            } else if (resultado) {
                descargarBlob(resultado);
            } else {
                descargarComoGeoJSON(geojson, nombre);
            }
            return;
        } catch(e) {
            console.error('Error generando SHP:', e);
        }
    }
    
    // Fallback: descargar como GeoJSON
    descargarComoGeoJSON(geojson, nombre);
}

function descargarComoGeoJSON(geojson, nombre) {
    var jsonStr = JSON.stringify(geojson, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombre + '_' + Date.now() + '.geojson';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function() { URL.revokeObjectURL(link.href); }, 10000);
    alert('No se pudo generar el SHP. Se descargó como GeoJSON.\n\nPara convertir a SHP, usa QGIS: Capa → Importar → Guardar como → Shapefile');
}