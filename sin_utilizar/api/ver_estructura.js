// Script para ver estructura de las tablas
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function verEstructura() {
    console.log('📋 Estructura de geo.faja_marginal:');
    const fajas = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'geo' AND table_name = 'faja_marginal'
        ORDER BY ordinal_position
    `);
    fajas.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    console.log('\n📋 Estructura de geo.poligono_faja_marginal:');
    const poligonos = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'geo' AND table_name = 'poligono_faja_marginal'
        ORDER BY ordinal_position
    `);
    poligonos.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    console.log('\n📋 Estructura de geo.resolucion:');
    const resolucion = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'geo' AND table_name = 'resolucion'
        ORDER BY ordinal_position
    `);
    resolucion.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));

    // Ver una fila de ejemplo
    console.log('\n📋 Ejemplo de faja_marginal:');
    const ejemplo = await pool.query('SELECT * FROM geo.faja_marginal LIMIT 1');
    console.log(ejemplo.rows[0]);

    pool.end();
}

verEstructura().catch(console.error);