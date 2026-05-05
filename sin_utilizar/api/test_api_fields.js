const http = require('http');

http.get('http://localhost:3000/api/poligonos-faja', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.features && json.features.length > 0) {
                console.log('Primer feature properties:');
                for (const key in json.features[0].properties) {
                    console.log('  - ' + key + ': ' + json.features[0].properties[key]);
                }
            }
        } catch(e) {
            console.log('Error:', e.message);
        }
    });
}).on('error', e => console.log('Error:', e.message));