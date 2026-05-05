const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

["vi_faja_marginal_hito", "vi_autorizacion_uso_temporal_poligono"].forEach(vista => {
    pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'geo' AND table_name = '" + vista + "' ORDER BY ordinal_position")
        .then(r => {
            console.log('\nColumnas de ' + vista + ':');
            r.rows.forEach(row => console.log(' - ' + row.column_name));
        })
        .catch(e => console.error('Error:', e.message));
});

setTimeout(() => pool.end(), 2000);