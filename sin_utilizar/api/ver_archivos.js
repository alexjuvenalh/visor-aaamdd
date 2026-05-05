const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

pool.query("SELECT archivo FROM geo.vi_faja_marginal_poligono WHERE archivo IS NOT NULL LIMIT 5")
    .then(r => {
        console.log('Archivos encontrados:', r.rows.length);
        r.rows.forEach(row => console.log(' - ' + row.archivo));
        pool.end();
    })
    .catch(e => {
        console.error('Error:', e.message);
        pool.end();
    });