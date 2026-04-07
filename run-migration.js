const fs = require('fs');
const https = require('https');

const sql = fs.readFileSync('supabase/migrations/001_create_tables.sql', 'utf8');

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    path: '/v1/projects/zxhsjjbekyqqurmjuttm/database/query',
    method: 'POST',
    headers: {
        'Authorization': 'Bearer sbp_07a08ea5f4abf5b714cb6cfcd9754292350d17e9',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = https.request(options, res => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
    });
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
