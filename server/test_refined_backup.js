require('dotenv').config();
const { performNightlyBackup } = require('./services/backupService');
const { getDB } = require('./db');

async function testRefinedBackup() {
    console.log('--- Manual Refined Backup Test Start ---');
    await getDB();
    try {
        await performNightlyBackup();
        console.log('--- Manual Refined Backup Test Success ---');
    } catch (err) {
        console.error('--- Manual Refined Backup Test Failed ---', err);
    }
}

testRefinedBackup();
