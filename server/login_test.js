const fetch = require('node-fetch');

async function testLogin() {
    console.log('Testing login locally...');
    try {
        const response = await fetch('http://localhost:4000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: 'admin@metro.com',
                password: 'admin123'
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response body:', data);
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testLogin();
