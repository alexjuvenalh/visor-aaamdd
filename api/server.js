const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Error conectando a la base de datos:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL:', process.env.DB_NAME);
    }
});

// ============================================
// ENDPOINTS - RESOLUCIONES
// ============================================

// GET /api/resoluciones - Listar todas las resoluciones
app.get('/api/resoluciones', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, a.nombre as nombre_aaa, al.nombre as nombre_ala
            FROM geo.resolucion r
            LEFT JOIN geo.aaa a ON r.id_aaa = a.id_aaa
            LEFT JOIN geo.ala al ON r.id_ala = al.id_ala
            ORDER BY r.id_resolucion DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/resoluciones/:id - Una resolución específica
app.get('/api/resoluciones/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, a.nombre as nombre_aaa, al.nombre as nombre_ala
            FROM geo.resolucion r
            LEFT JOIN geo.aaa a ON r.id_aaa = a.id_aaa
            LEFT JOIN geo.ala al ON r.id_ala = al.id_ala
            WHERE r.id_resolucion = $1
        `, [req.params.id]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - FAJA MARGINAL
// ============================================

// GET /api/fajas-marginales - Listar fajas marginales
app.get('/api/fajas-marginales', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT fm.*, r.numero_resolucion, r.fecha_resolucion, r.clase_resolucion
            FROM geo.faja_marginal fm
            LEFT JOIN geo.resolucion r ON fm.id_resolucion = r.id_resolucion
            ORDER BY fm.id_faja_marginal DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/fajas-marginales/:id - Una faja específica
app.get('/api/fajas-marginales/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT fm.*, r.numero_resolucion, r.fecha_resolucion, r.clase_resolucion
            FROM geo.faja_marginal fm
            LEFT JOIN geo.resolucion r ON fm.id_resolucion = r.id_resolucion
            WHERE fm.id_faja_marginal = $1
        `, [req.params.id]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - POLÍGONOS DE FAJA MARGINAL
// ============================================

// GET /api/fajas-marginales/:id/poligonos - Polígonos de una faja
app.get('/api/fajas-marginales/:id/poligonos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM geo.poligono_faja_marginal
            WHERE id_faja_marginal = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/poligonos-faja - Polígonos de faja marginal (desde vista)
app.get('/api/poligonos-faja', async (req, res) => {
    try {
        const result = await pool.query(`
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
        `);

        const features = result.rows.map(row => {
            let geometry;
            try {
                geometry = JSON.parse(row.geom_json);
            } catch(e) {
                geometry = null;
            }
            
            return {
                type: 'Feature',
                properties: {
                    id_poligono_faja_marginal: row.id_poligono_faja_marginal,
                    id_faja_marginal: row.id_poligono_faja_marginal,
                    nombre_faja_marginal: row.nombre_faja_marginal,
                    nombre_faja: row.nombre_faja,
                    numero_resolucion: row.numero_resolucion,
                    fecha_resolucion: row.fecha_resolucion,
                    clase_resolucion: row.clase_resolucion,
                    margen: row.margen,
                    aaa: row.aaa,
                    ala: row.ala,
                    cut: row.cut,
                    departamento: row.departamento,
                    provincia: row.provincia,
                    distrito: row.distrito,
                    sector: row.sector,
                    tipo_fuente: row.tipo_fuente,
                    resumen: row.resumen,
                    anio: row.anio,
                    archivo: row.archivo,
                    buscarfm: (row.numero_resolucion || '') + ' ' + (row.nombre_faja_marginal || '')
                },
                geometry: geometry
            };
        }).filter(f => f.geometry !== null);

        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - HITOS DE FAJA MARGINAL
// ============================================

// GET /api/hitos-faja - Hitos de faja marginal (desde vista)
app.get('/api/hitos-faja', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id_punto_hito,
                ST_AsGeoJSON(geom) as geom_json,
                hito,
                ancho_faja,
                este,
                norte,
                margen,
                aaa,
                ala,
                cut,
                numero_resolucion,
                fecha_resolucion,
                resumen,
                clase_resolucion,
                anio_rd as anio,
                archivo,
                detalle_rd,
                nombre_fuente,
                departamento,
                provincia,
                distrito,
                sector,
                tipo
            FROM geo.vi_faja_marginal_hito
        `);

        const features = result.rows.map(row => {
            let geometry;
            try {
                geometry = JSON.parse(row.geom_json);
            } catch(e) {
                geometry = null;
            }
            return {
                type: 'Feature',
                properties: {
                    id_punto_hito: row.id_punto_hito,
                    hito: row.hito,
                    ancho_faja: row.ancho_faja,
                    este: row.este,
                    norte: row.norte,
                    margen: row.margen,
                    aaa: row.aaa,
                    ala: row.ala,
                    cut: row.cut,
                    numero_resolucion: row.numero_resolucion,
                    fecha_resolucion: row.fecha_resolucion,
                    resumen: row.resumen,
                    clase_resolucion: row.clase_resolucion,
                    anio: row.anio,
                    archivo: row.archivo,
                    detalle_rd: row.detalle_rd,
                    nombre_fuente: row.nombre_fuente,
                    departamento: row.departamento,
                    provincia: row.provincia,
                    distrito: row.distrito,
                    sector: row.sector,
                    tipo: row.tipo
                },
                geometry: geometry
            };
        });

        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - AUTORIZACIONES DE USO TEMPORAL
// ============================================

// GET /api/autorizaciones-temporales - Lista de autorizaciones
app.get('/api/autorizaciones-temporales', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT aut.*, r.numero_resolucion, r.fecha_resolucion, r.clase_resolucion
            FROM geo.autorizacion_uso_temporal aut
            LEFT JOIN geo.resolucion r ON aut.id_resolucion = r.id_resolucion
            ORDER BY aut.id_autorizacion_uso_temporal DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/poligonos-autorizacion - Polígonos de autorizaciones (desde vista)
app.get('/api/poligonos-autorizacion', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id_poligono_aut,
                ST_AsGeoJSON(geom) as geom_json,
                area_otorgada,
                bien_asociado,
                nombre_o_razon_social,
                tipo_documento,
                numero_documento,
                departamento,
                provincia,
                distrito,
                sector,
                tipo_aut,
                area_total,
                fecha_autorizacion,
                periodo_autorizacion,
                numero_resolucion,
                fecha_resolucion,
                clase_resolucion,
                aaa,
                ala,
                cut,
                resumen,
                anio_rd as anio,
                archivo,
                detalle_rd,
                zona,
                datum,
                activo
            FROM geo.vi_autorizacion_uso_temporal_poligono
        `);

        const features = result.rows.map(row => {
            let geometry;
            try {
                geometry = JSON.parse(row.geom_json);
            } catch(e) {
                geometry = null;
            }
            
            return {
                type: 'Feature',
                properties: {
                    id_poligono_aut: row.id_poligono_aut,
                    id_autorizacion_uso_temporal: row.id_autorizacion_uso_temporal,
                    area_otorgada: row.area_otorgada,
                    bien_asociado: row.bien_asociado,
                    nombre_o_razon_social: row.nombre_o_razon_social,
                    tipo_documento: row.tipo_documento,
                    numero_documento: row.numero_documento,
                    numero_resolucion: row.numero_resolucion,
                    fecha_resolucion: row.fecha_resolucion,
                    clase_resolucion: row.clase_resolucion,
                    aaa: row.aaa,
                    ala: row.ala,
                    cut: row.cut,
                    departamento: row.departamento,
                    provincia: row.provincia,
                    distrito: row.distrito,
                    sector: row.sector,
                    tipo_aut: row.tipo_aut,
                    area_total: row.area_total,
                    fecha_autorizacion: row.fecha_autorizacion,
                    resumen: row.resumen,
                    archivo: row.archivo
                },
                geometry: geometry
            };
        }).filter(f => f.geometry !== null);

        res.json({
            type: 'FeatureCollection',
            features: features
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - DERECHOS (RADA)
// ============================================

// GET /api/derechos - Lista de derechos
app.get('/api/derechos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT d.*, r.numero_resolucion, r.fecha_resolucion
            FROM geo.derecho d
            LEFT JOIN geo.resolucion r ON d.id_resolucion = r.id_resolucion
            ORDER BY d.id_derecho DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - BÚSQUEDA
// ============================================

// GET /api/buscar?q=texto - Buscar en resoluciones y fajas
app.get('/api/buscar', async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return res.status(400).json({ error: 'Parámetro q es requerido' });
    }

    try {
        // Buscar en fajas marginales
        const fajas = await pool.query(`
            SELECT fm.id_faja_marginal, 'faja_marginal' as tipo, fm.nombre_faja_marginal, r.numero_resolucion
            FROM geo.faja_marginal fm
            LEFT JOIN geo.resolucion r ON fm.id_resolucion = r.id_resolucion
            WHERE fm.nombre_faja_marginal ILIKE $1 OR r.numero_resolucion ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

        // Buscar en autorizaciones
        const autorizaciones = await pool.query(`
            SELECT aut.id_autorizacion_uso_temporal, 'autorizacion' as tipo,
                   aut.nombre_o_razon_social, r.numero_resolucion
            FROM geo.autorizacion_uso_temporal aut
            LEFT JOIN geo.resolucion r ON aut.id_resolucion = r.id_resolucion
            WHERE aut.nombre_o_razon_social ILIKE $1 OR r.numero_resolucion ILIKE $1
            LIMIT 20
        `, [`%${q}%`]);

        res.json({
            fajas: fajas.rows,
            autorizaciones: autorizaciones.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINTS - ESTADÍSTICAS
// ============================================

// GET /api/estadisticas - Conteo de registros
app.get('/api/estadisticas', async (req, res) => {
    try {
        const [resoluciones, fajas, autorizaciones, derechos] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM geo.resolucion'),
            pool.query('SELECT COUNT(*) as total FROM geo.faja_marginal'),
            pool.query('SELECT COUNT(*) as total FROM geo.autorizacion_uso_temporal'),
            pool.query('SELECT COUNT(*) as total FROM geo.derecho')
        ]);

        res.json({
            resoluciones: parseInt(resoluciones.rows[0].total),
            fajas_marginales: parseInt(fajas.rows[0].total),
            autorizaciones_temporales: parseInt(autorizaciones.rows[0].total),
            derechos: parseInt(derechos.rows[0].total)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ENDPOINT DE PRUEBA
// ============================================

app.get('/api/ping', (req, res) => {
    res.json({ message: 'API funcionando', timestamp: new Date() });
});

// ============================================
// ENDPOINTS - EXPORTAR DATOS (para modo offline)
// ============================================

// GET /api/exportar/todo - Exportar todos los datos a JSON
app.get('/api/exportar/todo', async (req, res) => {
    try {
        // Polígonos de Faja Marginal
        const fajasPoligonos = await pool.query(`
            SELECT
                pf.id_poligono_faja_marginal,
                pf.id_faja_marginal,
                pf.geom,
                fm.nombre_faja_marginal,
                r.numero_resolucion,
                r.fecha_resolucion,
                r.clase_resolucion,
                fm.margen,
                fm.aaa,
                fm.ala,
                fm.cut,
                fm.distrito,
                fm.provincia,
                fm.sector,
                fm.resumen,
                fm.archivo
            FROM geo.poligono_faja_marginal pf
            JOIN geo.faja_marginal fm ON pf.id_faja_marginal = fm.id_faja_marginal
            LEFT JOIN geo.resolucion r ON fm.id_resolucion = r.id_resolucion
        `);

        // Hitos de Faja Marginal
        const hitos = await pool.query(`
            SELECT
                ph.id_punto_hito,
                ph.id_faja_marginal,
                ph.geom,
                ph.hito,
                ph.ancho_faja,
                ph.numero_resolucion as numero_resolucion,
                ph.fecha_resolucion,
                ph.margen,
                ph.archivo,
                fm.nombre_faja_marginal
            FROM geo.punto_hito ph
            JOIN geo.faja_marginal fm ON ph.id_faja_marginal = fm.id_faja_marginal
            LEFT JOIN geo.resolucion r ON fm.id_resolucion = r.id_resolucion
        `);

        // Autorizaciones de Uso Temporal
        const autorizaciones = await pool.query(`
            SELECT
                pa.id_poligono_aut,
                pa.id_autorizacion_uso_temporal,
                pa.geom,
                aut.id_autorizacion_uso_temporal,
                aut.area_otorgada,
                aut.bien_asociado,
                aut.nombre_o_razon_social,
                aut.tipo_documento,
                aut.numero_documento,
                r.numero_resolucion,
                r.fecha_resolucion,
                r.clase_resolucion,
                aut.ala,
                aut.cut,
                aut.distrito,
                aut.provincia,
                aut.sector,
                aut.tipo_aut,
                aut.fecha_autorizacion,
                aut.resumen,
                aut.archivo
            FROM geo.poligono_aut pa
            JOIN geo.autorizacion_uso_temporal aut ON pa.id_autorizacion_uso_temporal = aut.id_autorizacion_uso_temporal
            LEFT JOIN geo.resolucion r ON aut.id_resolucion = r.id_resolucion
        `);

        // Derechos (RADA)
        const derechos = await pool.query(`
            SELECT
                d.id_derecho,
                d.geom,
                d.tipo,
                d.nombre as nombre_derecho,
                d.usuario,
                r.numero_resolucion,
                r.fecha_resolucion,
                d.uso,
                d.clase
            FROM geo.derecho d
            LEFT JOIN geo.resolucion r ON d.id_resolucion = r.id_resolucion
        `);

        // Convertir a GeoJSON
        const fajasFeatures = fajasPoligonos.rows.map(row => ({
            type: 'Feature',
            properties: {
                id_poligono_faja_marginal: row.id_poligono_faja_marginal,
                id_faja_marginal: row.id_faja_marginal,
                nombre_faja_marginal: row.nombre_faja_marginal,
                numero_resolucion: row.numero_resolucion,
                fecha_resolucion: row.fecha_resolucion,
                clase_resolucion: row.clase_resolucion,
                margen: row.margen,
                aaa: row.aaa,
                ala: row.ala,
                cut: row.cut,
                distrito: row.distrito,
                provincia: row.provincia,
                sector: row.sector,
                resumen: row.resumen,
                archivo: row.archivo,
                buscarfm: (row.numero_resolucion || '') + ' ' + (row.nombre_faja_marginal || '')
            },
            geometry: row.geom
        }));

        const hitosFeatures = hitos.rows.map(row => ({
            type: 'Feature',
            properties: {
                id_punto_hito: row.id_punto_hito,
                id_faja_marginal: row.id_faja_marginal,
                hito: row.hito,
                ancho_faja: row.ancho_faja,
                numero_resolucion: row.numero_resolucion,
                fecha_resolucion: row.fecha_resolucion,
                margen: row.margen,
                nombre_faja_marginal: row.nombre_faja_marginal,
                archivo: row.archivo,
                este: row.este,
                norte: row.norte
            },
            geometry: row.geom
        }));

        const autorizacionFeatures = autorizaciones.rows.map(row => ({
            type: 'Feature',
            properties: {
                id_poligono_aut: row.id_poligono_aut,
                id_autorizacion_uso_temporal: row.id_autorizacion_uso_temporal,
                area_otorgada: row.area_otorgada,
                bien_asociado: row.bien_asociado,
                nombre_o_razon_social: row.nombre_o_razon_social,
                tipo_documento: row.tipo_documento,
                numero_documento: row.numero_documento,
                numero_resolucion: row.numero_resolucion,
                fecha_resolucion: row.fecha_resolucion,
                clase_resolucion: row.clase_resolucion,
                ala: row.ala,
                cut: row.cut,
                distrito: row.distrito,
                provincia: row.provincia,
                sector: row.sector,
                tipo_aut: row.tipo_aut,
                fecha_autorizacion: row.fecha_autorizacion,
                resumen: row.resumen,
                archivo: row.archivo
            },
            geometry: row.geom
        }));

        const derechosFeatures = derechos.rows.map(row => ({
            type: 'Feature',
            properties: {
                id_derecho: row.id_derecho,
                tipo: row.tipo,
                nombre_derecho: row.nombre_derecho,
                usuario: row.usuario,
                numero_resolucion: row.numero_resolucion,
                fecha_resolucion: row.fecha_resolucion,
                uso: row.uso,
                clase: row.clase,
                ala: row.ala
            },
            geometry: row.geom
        }));

        // Devolver todo en un solo JSON
        res.json({
            version: '1.0',
            fecha_exportacion: new Date().toISOString(),
            estadisticas: {
                fajas_marginales: fajasFeatures.length,
                hitos: hitosFeatures.length,
                autorizaciones: autorizacionFeatures.length,
                derechos: derechosFeatures.length
            },
            faja_poligono: { type: 'FeatureCollection', features: fajasFeatures },
            faja_hito: { type: 'FeatureCollection', features: hitosFeatures },
            uso_temporal: { type: 'FeatureCollection', features: autorizacionFeatures },
            rada_por_fuente: { type: 'FeatureCollection', features: derechosFeatures.filter(d => d.properties.tipo === 'fuente') },
            rada_por_derecho: { type: 'FeatureCollection', features: derechosFeatures.filter(d => d.properties.tipo === 'derecho') }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/exportar/fecha - Ver fecha de última exportación
app.get('/api/exportar/fecha', async (req, res) => {
    res.json({
        ultimo_export: new Date().toISOString(),
        nota: 'Usa /api/exportar/todo para obtener los datos'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
    console.log(`📋 Endpoints disponibles:`);
    console.log(`   - GET /api/ping`);
    console.log(`   - GET /api/estadisticas`);
    console.log(`   - GET /api/resoluciones`);
    console.log(`   - GET /api/fajas-marginales`);
    console.log(`   - GET /api/poligonos-faja`);
    console.log(`   - GET /api/hitos-faja`);
    console.log(`   - GET /api/poligonos-autorizacion`);
    console.log(`   - GET /api/buscar?q=texto`);
});