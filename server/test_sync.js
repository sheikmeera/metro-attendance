require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { initAutomation, backupDatabase, generateAllReportsBatch, syncToDrive } = require('./automationService');
const { connectDB } = require('./db');

async function testSync() {
    console.log('--- Testing Google Drive Sync ---');
    try {
        await connectDB();
        console.log('1. Database connected.');

        console.log('2. Triggering generateAllReportsBatch() which calls syncToDrive()...');
        await generateAllReportsBatch();

        console.log('--- Sync Test Complete ---');
        process.exit(0);
    } catch (err) {
        console.error('Sync Test Failed:', err);
        process.exit(1);
    }
}

testSync();
