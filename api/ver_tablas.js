// Ver estructura de más tablas
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

async function verTablas() {
    console.log('\n📋 geo.punto_hito:');
    const h = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'punto_hito' ORDER BY ordinal_position`);
    h.rows.forEach(r => console.log(`  ${r.column_name}`));

    console.log('\n📋 geo.autorizacion_uso_temporal:');
    const a = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'autorizacion_uso_temporal' ORDER BY ordinal_position`);
    a.rows.forEach(r => console.log(`  ${r.column_name}`));

    console.log('\n📋 geo.poligono_aut:');
    const pa = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'poligono_aut' ORDER BY ordinal_position`);
    pa.rows.forEach(r => console.log(`  ${r.column_name}`));

    console.log('\n📋 geo.derecho:');
    const d = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'derecho' ORDER BY ordinal_position`);
    d.rows.forEach(r => console.log(`  ${r.column_name}`));

    pool.end();
}

verTablas().catch(console.error);