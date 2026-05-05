const { Pool } = require('pg');
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Aut0ridad1',
    database: 'aaamadrededios'
});

// Probar consulta de faja marginal
pool.query('SELECT count(*) as total FROM geo.vi_faja_marginal_poligono')
    .then(r => console.log('Faja marginal:', r.rows[0].total))
    .catch(e => console.error('Error faja:', e.message))

.then(() => pool.query('SELECT count(*) as total FROM geo.vi_faja_marginal_hito'))
    .then(r => console.log('Hitos:', r.rows[0].total))
    .catch(e => console.error('Error hitos:', e.message))

.then(() => pool.query('SELECT count(*) as total FROM geo.vi_autorizacion_uso_temporal_poligono'))
    .then(r => console.log('Autorizaciones:', r.rows[0].total))
    .catch(e => console.error('Error auth:', e.message))

.then(() => pool.end())
.catch(e => { console.error(e); pool.end(); });