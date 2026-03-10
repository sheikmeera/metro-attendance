require('dotenv').config();
const { createClient } = require('@libsql/client');

async function test() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    console.log('Testing Turso connection...');
    console.log('URL:', url);

    if (!url) {
        console.error('TURSO_DATABASE_URL is missing!');
        return;
    }

    try {
        const client = createClient({ url, authToken });
        const res = await client.execute('SELECT COUNT(*) as count FROM admins');
        console.log('Admins count:', res.rows[0][0]);

        // Check all tables row counts
        const tables = ['admins', 'employees', 'sites', 'attendance', 'reports', 'departments'];
        for (const table of tables) {
            try {
                const tr = await client.execute(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Table ${table} rows:`, tr.rows[0][0]);
            } catch (e) {
                console.log(`Table ${table} might not exist yet:`, e.message);
            }
        }

        console.log('Connection successful!');
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

test();
