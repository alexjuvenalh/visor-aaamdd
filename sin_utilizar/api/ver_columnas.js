const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = 'vi_faja_marginal_poligono' ORDER BY ordinal_position")
    .then(r => {
        console.log('Columnas de vi_faja_marginal_poligono:');
        r.rows.forEach(row => console.log(' - ' + row.column_name));
        pool.end();
    })
    .catch(e => {
        console.error('Error:', e.message);
        pool.end();
    });