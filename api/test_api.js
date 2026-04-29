const http = require('http');

http.get('http://localhost:3000/api/poligonos-faja', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Status:', res.statusCode);
            console.log('Features:', json.features?.length || 0);
            if (json.features && json.features.length > 0) {
                console.log('Primer geometry type:', json.features[0].geometry?.type);
            }
        } catch(e) {
            console.log('Error:', e.message);
            console.log('Data:', data.substring(0, 500));
        }
    });
}).on('error', e => console.log('Error:', e.message));