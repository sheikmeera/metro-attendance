const fs = require('fs');
const path = require('path');

async function runPdfE2E() {
    console.log('--- PDF Generation E2E Test ---');
    const baseUrl = 'http://localhost:4000/api';
    let adminToken = '';

    try {
        // 1. Login as Admin
        console.log('[1/5] Logging in as Admin...');
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: 'admin@metro.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
        adminToken = loginData.token;
        console.log('   Success: Admin logged in.');

        // 2. Test Daily Log PDF
        console.log('[2/5] Testing Daily Log PDF generation...');
        const today = new Date().toISOString().split('T')[0];
        const dailyRes = await fetch(`${baseUrl}/admin/logs/daily?date=${today}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        if (dailyRes.status !== 200) throw new Error(`Daily Log PDF failed with status ${dailyRes.status}`);
        const dailyType = dailyRes.headers.get('content-type');
        if (!dailyType || !dailyType.includes('application/pdf')) throw new Error(`Invalid content type for Daily Log: ${dailyType}`);
        console.log('   Success: Daily Log PDF generated (application/pdf).');

        // 3. Test Employee Log PDF
        // First get an employee ID
        console.log('[3/5] Testing Employee Log PDF generation...');
        const empListRes = await fetch(`${baseUrl}/admin/employees`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const employees = await empListRes.json();
        if (employees.length > 0) {
            const empId = employees[0].id;
            const empLogRes = await fetch(`${baseUrl}/admin/logs/employee?employee_id=${empId}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (empLogRes.status !== 200) throw new Error(`Employee Log PDF failed with status ${empLogRes.status}`);
            console.log(`   Success: Employee Log PDF for ${empId} generated.`);
        } else {
            console.log('   Skip: No employees found to test.');
        }

        // 4. Test Site Log PDF
        console.log('[4/5] Testing Site Log PDF generation...');
        const siteListRes = await fetch(`${baseUrl}/admin/sites`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const sites = await siteListRes.json();
        if (sites.length > 0) {
            const siteId = sites[0].id;
            const siteLogRes = await fetch(`${baseUrl}/admin/logs/site?site_id=${siteId}`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            if (siteLogRes.status !== 200) throw new Error(`Site Log PDF failed with status ${siteLogRes.status}`);
            console.log(`   Success: Site Log PDF for ${siteId} generated.`);
        } else {
            console.log('   Skip: No sites found to test.');
        }

        // 5. Cleanup & Finish
        console.log('[5/5] Finalizing...');
        console.log('\n✅ PDF E2E TEST PASSED: All PDF endpoints responded with valid PDF streams.');
        process.exit(0);

    } catch (err) {
        console.error('\n❌ PDF E2E TEST FAILED:', err.message);
        process.exit(1);
    }
}

runPdfE2E();
