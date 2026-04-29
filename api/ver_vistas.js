const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

pool.query("SELECT table_name FROM information_schema.views WHERE table_schema = 'geo' ORDER BY table_name")
    .then(r => {
        console.log('Vistas en schema geo:');
        r.rows.forEach(row => console.log(' - ' + row.table_name));
        pool.end();
    })
    .catch(e => {
        console.error('Error:', e.message);
        pool.end();
    });