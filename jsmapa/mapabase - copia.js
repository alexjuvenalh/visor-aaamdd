var map = L.map('map', {
    center: [-12.5933100, -69.1891300],
    zoom: 8,
});
var title = L.control();
title.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'info');
    div.innerHTML +=
        '<center><img src="imagenes/logo.png" height="50" width="100"></center>';
    /*'<h2>Autoridad Administrativa del Agua</h2><center><h2>Madre de Dios</h2></center><img src="imagenes/favicon.png" height="42" width="42">';*/
    return div;
};
title.addTo(map);
googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
}).addTo(map);

var basemaps = {
    // Departamento: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
    //     layers: 'aaamdd:departamento',
    //     format: 'image/png',
    //     transparent: true,
    //     version: '1.1.0',
    //     attribution: "myattribution"
    // }),

    // Provincia: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
    //     layers: 'aaamdd:provincia',
    //     format: 'image/png',
    //     transparent: true,
    //     version: '1.1.0',
    //     attribution: "myattribution"
    // }),
    // Distrito: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
    //     layers: 'aaamdd:distrito',
    //     format: 'image/png',
    //     transparent: true,
    //     version: '1.1.0',
    //     attribution: "myattribution"
    // }),
    AAA: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
            layers: 'aaamdd:aaa',
            format: 'image/png',
            transparent: true,
            version: '1.1.0',
            attribution: "myattribution"
        })
        // ALA: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
        //     layers: 'aaamdd:ala',
        //     format: 'image/png',
        //     transparent: true,
        //     version: '1.1.0',
        //     attribution: "myattribution"
        // }),
        // Rio: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
        //     layers: 'aaamdd:rio_principal',
        //     format: 'image/png',
        //     transparent: true,
        //     version: '1.1.0',
        //     attribution: "myattribution"
        // }),
        // Carta: L.tileLayer.wms('http://localhost:8080/geoserver/ows?', {
        //     layers: 'aaamdd:carta',
        //     format: 'image/png',
        //     transparent: true,
        //     version: '1.1.0',
        //     attribution: "myattribution"
        //})
};
/*var FajaMarginal=L.geoJson(fajapol,{
  style: style, onEachFeature: popup 
 }).addTo(map);*/

var faja_marginal = L.geoJson(faja_poligono, {
    style: style,
    onEachFeature: onEachFeature
});
var hito_faja = L.geoJson(faja_hito, {
    onEachFeature: function(feature, layer) {

        layer.bindPopup("<strong>Hito: </strong>" + feature.properties.hito + '<br/> <b>Ancho Faja: </b>' + feature.properties.ancho_faja + '<br/><b>Numero RD: </b>' + feature.properties.numero_resolucion +
            '<br/> <b>Fecha Resolucion: </b>' + feature.properties.fecha_resolucion + '<br/><b>Margen: </b>' + feature.properties.margen + '<br/><b>ESTE: </b>' + feature.properties.este + '<br/><b>NORTE: </b>' + feature.properties.norte);
    }
});
var aut = L.geoJson(uso_temporal, {
    onEachFeature: function(feature, layer) {
        layer.bindPopup('<center>' + feature.properties.clase_resolucion + '</center><br/> <b>AREA OTORGADA: </b>' + feature.properties.area_otorgada + '<br/><b>BIEN ASOCIADO: </b>' + feature.properties.bien_asociado +
            '<br/><b>AAA: </b>' + feature.properties.aaa + '<br/><b>ALA: </b>' + feature.properties.ala + '<br/><b>CUT: </b>' + feature.properties.cut + '<br/><b>NUMERO RESOLUCION: </b>' + feature.properties.numero_resolucion +
            '<br/><b>FECHA DE RESOLUCION: </b>' + feature.properties.fecha_resolucion + '<br/><b>RESUMEN: </b>' + feature.properties.resumen + '<br/><b>NOMBRE O RAZON SOCIAL: </b>' + feature.properties.nombre_o_razon_social +
            '<br/><b>DOCUMENTO: </b><b>' + feature.properties.tipo_documento + '</b> ' + feature.properties.numero_documento + '<br/><b>DEPARTAMENTO: </b>' + feature.properties.departamento + '<br/><b>PROVINCIA: </b>' + feature.properties.provincia +
            '<br/><b>DISTRITO: </b>' + feature.properties.distrito + '<br/><b>SECTOR: </b>' + feature.properties.sector + '<br/><b>TIPO DE AUTORIZACION: </b>' + feature.properties.tipo_aut + '<br/><b>FECHA AUTORIZACION: </b>' + feature.properties.fecha_autorizacion
        );
    }
});
var rada_fuente = L.geoJson(rada_por_fuente, {
    onEachFeature: function(feature, layer) {

        layer.bindPopup("<strong>ALA: </strong>" + feature.properties.ala + '<br/> <b>Numero de Resolucion: </b>' + feature.properties.resolucion + '<br/><b>Fecha RD: </b>' + feature.properties.fecha +
            '<br/> <b>Tipo de Uso: </b>' + feature.properties.uso + '<br/><b>Clase: </b>' + feature.properties.clase + '<br/><b>Usuario: </b>' + feature.properties.usuario);
    }
});
var rada_derecho = L.geoJson(rada_por_derecho, {
    onEachFeature: function(feature, layer) {

        layer.bindPopup("<strong>ALA: </strong>" + feature.properties.ala + '<br/> <b>Numero de Resolucion: </b>' + feature.properties.resolucion + '<br/><b>Fecha RD: </b>' + feature.properties.fecha +
            '<br/> <b>Tipo de Uso: </b>' + feature.properties.uso + '<br/><b>Clase: </b>' + feature.properties.clase + '<br/><b>Usuario: </b>' + feature.properties.usuario);
    }
});
//document.getElementById("addButton").addEventListener("click", adicionarFajaPoligono);
//document.getElementById("toggleButton").addEventListener("click", toggleFajaMarginal);
var checkBoxFaja = document.getElementById("chkFaja");
checkBoxFaja.addEventListener("click", activarFajaMarginal);
var checkBoxHito = document.getElementById("chkHito");
var checkBoxAut = document.getElementById("chkAut");
var checkBoxRadaFuente=document.getElementById("chkRadaFuente")
var checkBoxRadaDerecho=document.getElementById("chkRadaDerecho")
/*function toggleFajaMarginal(){
  if(map.hasLayer(faja_marginal)){
    map.removeLayer(faja_marginal);
  } else {
    faja_marginal.addTo(map);
  }
}
function adicionarFajaPoligono(){
  faja_marginal.addTo(map);
}*/
function activarFajaMarginal() {
    if (checkBoxFaja.checked == true) {
        faja_marginal.addTo(map);
        info2.addTo(map);
    } else {
        map.removeLayer(faja_marginal);
        map.removeControl(info2);
    }
}

function activarHitoFaja() {
    if (checkBoxHito.checked == true) {
        hito_faja.addTo(map);

    } else {
        map.removeLayer(hito_faja);
    }

}

function activarAut() {
    if (checkBoxAut.checked == true) {
        aut.addTo(map);
    } else {
        map.removeLayer(aut);
    }
}
function activarRadaFuente() {
    if (checkBoxRadaFuente.checked == true) {
        rada_fuente.addTo(map);

    } else {
        map.removeLayer(rada_fuente);
    }

}
function activarRadaDerecho() {
    if (checkBoxRadaDerecho.checked == true) {
        rada_derecho.addTo(map);

    } else {
        map.removeLayer(rada_derecho);
    }

}
/*----------------------------------------------------------------------------------------------------------------------------*/
L.control.layers({}, basemaps, { collapsed: false }).addTo(map);
basemaps.AAA.addTo(map);
/*----------------------------------------------------------------------------------------------------------------------*/
var info2 = L.control();

info2.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.updateFaja();
    return this._div;
};

info2.updateFaja = function(props) {

    this._div.innerHTML = (props ?

        '<center> <b>' + props.clase_resolucion + '</b></center><br/><b>NOMBRE DE FAJA: </b>' + props.nombre_faja_marginal + '<br /> <b>NUMERO DE RESOLUCION: </b>' + props.numero_resolucion + '<br /> <b>FECHA RESOLUCION: </b>' + props.fecha_resolucion + '<br/> <b> MARGEN:</b>' + props.margen +
        '<br/> <b>AAA:</b>' + props.aaa + '<br/> <b>ALA:</b>' + props.ala + '<br/> <b>CUT: </b>' + props.cut + '<br/> <b>Resumen: </b>' + props.resumen + '<br/> <b>AÑO: </b>' + props.anio_rd + '<br/> <b>DEPARTEMENTO: </b>' + props.departamento +
        '<br/> <b>PROVINCIA: </b>' + props.provincia + '<br/> <b>DISTRITO: </b>' + props.distrito + '<br/> <b>SECTOR: </b>' + props.sector : '');
};


// get color depending on population density value
function getColor(d) {
    return d > 1000 ? '#800026' :
        d > 500 ? '#BD0026' :
        d > 200 ? '#E31A1C' :
        d > 100 ? '#FC4E2A' :
        d > 50 ? '#FD8D3C' :
        d > 20 ? '#FEB24C' :
        d > 10 ? '#FED976' :
        '#FFEDA0';
}

function style(feature) {
    return {
        weight: 2,
        opacity: 1,
        color: 'white',
        dashArray: '3',
        fillOpacity: 0.3,
        fillColor: getColor(feature.properties.density)
    };
}

function highlightFeature(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
        layer.bringToFront();
    }

    info2.updateFaja(layer.feature.properties);

}
//var geojson;

function resetHighlight(e) {
     faja_marginal.resetStyle(e.target);
     info2.updateFaja();

}

function zoomToFeature(e) {
     map.fitBounds(e.target.getBounds());
 }

 function onEachFeature(feature, layer) {
     layer.on({
         mouseover: highlightFeature,
         mouseout: resetHighlight,
         click: zoomToFeature
     });
 }
/**------------------------------------------------------------------------------------------------------------------------------------------------------------------/ */
// var info3 = L.control();

// info3.onAdd = function(map) {
//     this._div = L.DomUtil.create('div', 'info');
//     this.updateHito();
//     return this._div;
// };
// info3.updateHito = function(props) {
//     this._div.innerHTML = '<h4><center> Informacion AAA Madre De Dios</center></h4>' + (props ?
//         '<center> <b>' + props.clase_resolucion + '</b></center><br/><b>Hito: </b>' + props.hito + '<br/><b>ANCHO FAJA:' + props.ancho_faja : '');
// };

// function highlightFeature2(e) {
//     var layer = e.target;

//     layer.setStyle({
//         weight: 5,
//         color: '#666',
//         dashArray: '',
//         fillOpacity: 0.7
//     });

//     if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
//         layer.bringToFront();
//     }

//     info3.updateHito(layer.feature.properties);

// }

// function resetHighlight2(e) {
//     hito_faja.resetStyle(e.target);
//     info3.updateHito();

// }

// function zoomToFeature2(e) {
//     map.fitBounds(e.target.getBounds());
// }

// function onEachFeature2(feature, layer) {
//     layer.on({
//         mouseover: highlightFeature2,
//         mouseout: resetHighlight2,
//         click: zoomToFeature2
//     });
// }