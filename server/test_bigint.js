require('dotenv').config();
const { createClient } = require('@libsql/client');

async function testBigInt() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });

    try {
        console.log('Fetching a row with integers...');
        const res = await client.execute('SELECT 1 as id');
        const row = res.rows[0];
        const val = row[0];

        console.log('Value type:', typeof val);
        console.log('Value:', val);

        try {
            console.log('Trying JSON.stringify...');
            const json = JSON.stringify({ id: val });
            console.log('JSON:', json);
        } catch (e) {
            console.error('JSON.stringify FAILED:', e.message);
        }
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testBigInt();
