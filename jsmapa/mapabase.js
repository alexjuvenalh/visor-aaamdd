// Función para sanitizar HTML y prevenir XSS
function sanitize(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

let map = L.map('map', {
    center: [-12.5933100, -69.1891300],
    zoom: 8,
});
let title = L.control();
title.onAdd = function(map) {
    let div = L.DomUtil.create('div', 'info');
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


let faja_marginal = L.geoJson(faja_poligono, {
   
    onEachFeature: function(feature, layer) {
        let p = feature.properties;
        let linkPDF = '';
        if (p.archivo) {
            linkPDF = '<br/><b>Resolución: </b><a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + '">' + sanitize(p.archivo) + '</a>';
        }
        layer.bindPopup(
            '<center><b>' + sanitize(p.clase_resolucion) + '</b></center><br/>' +
            '<b>Nombre Faja: </b>' + sanitize(p.nombre_faja_marginal) + '<br/>' +
            '<b>Margen: </b>' + sanitize(p.margen) + '<br/>' +
            '<b>N° Resolución: </b>' + sanitize(p.numero_resolucion) + '<br/>' +
            '<b>Fecha Resolución: </b>' + sanitize(p.fecha_resolucion) + '<br/>' +
            '<b>AAA: </b>' + sanitize(p.aaa) + '<br/>' +
            '<b>ALA: </b>' + sanitize(p.ala) + '<br/>' +
            '<b>CUT: </b>' + sanitize(p.cut) + '<br/>' +
            '<b>Departamento: </b>' + sanitize(p.departamento) + '<br/>' +
            '<b>Provincia: </b>' + sanitize(p.provincia) + '<br/>' +
            '<b>Distrito: </b>' + sanitize(p.distrito) + '<br/>' +
            '<b>Sector: </b>' + sanitize(p.sector) + '<br/>' +
            '<b>Resumen: </b>' + sanitize(p.resumen) + linkPDF
        );
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
        });
    },
    //zoom:15,
  
});

//---------------------------------------busqueda--------------------------------------------------------//
function busquedaControl(capa,dato) {
    let searchControl = new L.Control.Search({
        layer: capa,
        propertyName: dato,
        circleLocation: false,
        initial:false,
        zoom:13
        //marker:false
    });
    return searchControl;
}
const dato='numero_resolucion'
let searchControlFaja= busquedaControl(faja_marginal,dato)

let info2 = L.control();

info2.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info');
    this.updateFaja();
    return this._div;
};
info2.updateFaja = function(props) {

    this._div.innerHTML = (props ?

        // '<center> <b>' + props.clase_resolucion + '</b></center><br/><b>NOMBRE DE FAJA: </b>' + props.nombre_faja_marginal + '<br /> <b>NUMERO DE RESOLUCION: </b>' + props.numero_resolucion + '<br /> <b>FECHA RESOLUCION: </b>' + props.fecha_resolucion + '<br/> <b> MARGEN:</b>' + props.margen +
        // '<br/> <b>AAA:</b>' + props.aaa + '<br/> <b>ALA:</b>' + props.ala + '<br/> <b>CUT: </b>' + props.cut + '<br/> <b>Resumen: </b>' + props.resumen + '<br/> <b>AÑO: </b>' + props.anio_rd + '<br/> <b>DEPARTEMENTO: </b>' + props.departamento +
        // '<br/> <b>PROVINCIA: </b>' + props.provincia + '<br/> <b>DISTRITO: </b>' + props.distrito + '<br/> <b>SECTOR: </b>' + props.sector : '');
        '<center> <b>' + props.clase_resolucion+'</b></center><br/><b>NOMBRE DE FAJA: </b> ' + props.nombre_faja_marginal+'<br/>' +'<b>Numero de Resolucion:</b>'+props.numero_resolucion:'');
};
function highlightFeature(e) {
    let layer = e.target;

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

let hito_faja = L.geoJson(faja_hito, {
    onEachFeature: function(feature, layer) {
        let p = feature.properties;
        layer.bindPopup("<strong>Hito: </strong>" + sanitize(p.hito) + '<br/> <b>Ancho Faja: </b>' + sanitize(p.ancho_faja) + '<br/><b>Numero RD: </b>' + sanitize(p.numero_resolucion) +
            '<br/> <b>Fecha Resolucion: </b>' + sanitize(p.fecha_resolucion) + '<br/><b>Margen: </b>' + sanitize(p.margen) + '<br/><b>ESTE: </b>' + sanitize(p.este) + '<br/><b>NORTE: </b>' + sanitize(p.norte));
    }
});
//--------------------------------------------------------------------------------------------------------------------------------//


let searchControlHito= busquedaControl(hito_faja,dato)
//activarArchivo(hito_faja)


let aut = L.geoJson(uso_temporal, {
    onEachFeature: function(feature, layer) {
        let p = feature.properties;
        let linkPDF = '';
        if (p.archivo) {
            linkPDF = '<br/><b>Resolución: </b><a target="_blank" href="http://www.ana.gob.pe/sites/default/files/normatividad/files/' + sanitize(p.archivo) + '">' + sanitize(p.archivo) + '</a>';
        }
        layer.bindPopup(
            '<center><b>' + sanitize(p.clase_resolucion) + '</b></center><br/>' +
            '<b>Área Otorgada: </b>' + sanitize(p.area_otorgada) + '<br/>' +
            '<b>Bien Asociado: </b>' + sanitize(p.bien_asociado) + '<br/>' +
            '<b>AAA: </b>' + sanitize(p.aaa) + '<br/>' +
            '<b>ALA: </b>' + sanitize(p.ala) + '<br/>' +
            '<b>CUT: </b>' + sanitize(p.cut) + '<br/>' +
            '<b>N° Resolución: </b>' + sanitize(p.numero_resolucion) + '<br/>' +
            '<b>Fecha Resolución: </b>' + sanitize(p.fecha_resolucion) + '<br/>' +
            '<b>Resumen: </b>' + sanitize(p.resumen) + '<br/>' +
            '<b>Nombre/Razón Social: </b>' + sanitize(p.nombre_o_razon_social) + '<br/>' +
            '<b>Documento: </b>' + sanitize(p.tipo_documento) + ' ' + sanitize(p.numero_documento) + '<br/>' +
            '<b>Departamento: </b>' + sanitize(p.departamento) + '<br/>' +
            '<b>Provincia: </b>' + sanitize(p.provincia) + '<br/>' +
            '<b>Distrito: </b>' + sanitize(p.distrito) + '<br/>' +
            '<b>Sector: </b>' + sanitize(p.sector) + '<br/>' +
            '<b>Tipo de Autorización: </b>' + sanitize(p.tipo_aut) + '<br/>' +
            '<b>Fecha Autorización: </b>' + sanitize(p.fecha_autorizacion) + linkPDF
        );
    }
});
let rada_fuente = L.geoJson(rada_por_fuente, {
    onEachFeature: function(feature, layer) {
        let p = feature.properties;
        layer.bindPopup("<strong>ALA: </strong>" + sanitize(p.ala) + '<br/> <b>Numero de Resolucion: </b>' + sanitize(p.resolucion) + '<br/><b>Fecha RD: </b>' + sanitize(p.fecha) +
            '<br/> <b>Tipo de Uso: </b>' + sanitize(p.uso) + '<br/><b>Clase: </b>' + sanitize(p.clase) + '<br/><b>Usuario: </b>' + sanitize(p.usuario);
    }
});
let rada_derecho = L.geoJson(rada_por_derecho, {
    onEachFeature: function(feature, layer) {
        let p = feature.properties;
        layer.bindPopup("<strong>ALA: </strong>" + sanitize(p.ala) + '<br/> <b>Numero de Resolucion: </b>' + sanitize(p.resolucion) + '<br/><b>Fecha RD: </b>' + sanitize(p.fecha) +
            '<br/> <b>Tipo de Uso: </b>' + sanitize(p.uso) + '<br/><b>Clase: </b>' + sanitize(p.clase) + '<br/><b>Usuario: </b>' + sanitize(p.usuario);
    }
});

let checkBoxFaja = document.getElementById("chkFaja");
checkBoxFaja.addEventListener("click", activarFajaMarginal);
let checkBoxHito = document.getElementById("chkHito");
let checkBoxAut = document.getElementById("chkAut");
let checkBoxRadaFuente=document.getElementById("chkRadaFuente");
let checkBoxRadaDerecho=document.getElementById("chkRadaDerecho");

function activarFajaMarginal() {
    if (checkBoxFaja.checked == true) {
        faja_marginal.addTo(map);
        info2.addTo(map);
        map.addControl(searchControlFaja);
    } else {
        map.removeLayer(faja_marginal);
        map.removeControl(info2);
        map.removeControl(searchControlFaja);
    }
}

function activarHitoFaja() {
    if (checkBoxHito.checked == true) {
        hito_faja.addTo(map);
        map.addControl(searchControlHito);

    } else {
        map.removeLayer(hito_faja);
        map.removeControl(searchControlHito);
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

