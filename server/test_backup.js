/**
 * test_backup.js
 * Manually triggers the backup process for verification.
 */
require('dotenv').config();
const { getDB } = require('./db');
const { performNightlyBackup } = require('./services/backupService');

async function test() {
    console.log('--- Manual Backup Test Start ---');
    try {
        await getDB();
        await performNightlyBackup();
        console.log('--- Manual Backup Test End ---');
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
