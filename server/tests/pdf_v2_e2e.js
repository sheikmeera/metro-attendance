/**
 * server/tests/pdf_v2_e2e.js
 * Verification for PDF v2 reimplementation.
 */
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:4000/api';
let token = '';

async function runTests() {
    console.log('--- Starting PDF v2 E2E Tests ---');

    try {
        // 1. Login
        console.log('Step 1: Admin Login');
        const loginRes = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin@metro.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) throw new Error('Login failed: ' + JSON.stringify(loginData));
        token = loginData.token;
        console.log('✔ Login successful');

        // 2. Test Daily PDF
        console.log('\nStep 2: Testing Daily PDF');
        const today = new Date().toISOString().split('T')[0];
        const dailyRes = await fetch(`${API_BASE}/admin/logs/daily?date=${today}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (dailyRes.status !== 200) throw new Error(`Daily PDF failed: ${dailyRes.status}`);
        const dailySize = (await dailyRes.buffer()).length;
        console.log(`✔ Daily PDF generated (${dailySize} bytes)`);

        // 3. Test Employee PDF
        console.log('\nStep 3: Testing Employee PDF');
        // Get employees first to find a valid ID
        const empListRes = await fetch(`${API_BASE}/admin/employees`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const employees = await empListRes.json();
        const testEmp = employees[0]?.id || 'MET001';
        const empRes = await fetch(`${API_BASE}/admin/logs/employee?employee_id=${testEmp}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (empRes.status !== 200) throw new Error(`Employee PDF failed: ${empRes.status}`);
        const empSize = (await empRes.buffer()).length;
        console.log(`✔ Employee PDF generated for ${testEmp} (${empSize} bytes)`);

        // 4. Test Site PDF
        console.log('\nStep 4: Testing Site PDF');
        const siteListRes = await fetch(`${API_BASE}/admin/sites`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const sites = await siteListRes.json();
        const testSite = sites[0]?._id;
        if (testSite) {
            const siteRes = await fetch(`${API_BASE}/admin/logs/site?site_id=${testSite}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (siteRes.status !== 200) throw new Error(`Site PDF failed: ${siteRes.status}`);
            const siteSize = (await siteRes.buffer()).length;
            console.log(`✔ Site PDF generated for ${testSite} (${siteSize} bytes)`);
        } else {
            console.log('⚠ No sites found, skipping site PDF test');
        }

        console.log('\n--- All PDF v2 E2E Tests Passed! ---');
    } catch (err) {
        console.error('\n❌ E2E Test Failed:', err.message);
        process.exit(1);
    }
}

runTests();
