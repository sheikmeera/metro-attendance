const { getDriveService, syncDirectory } = require('./services/driveService');
const path = require('path');
require('dotenv').config();

const BACKUP_DIR = path.join(__dirname, 'backups');

async function testSync() {
    console.log('--- Starting Verbose Drive Sync Test ---');
    const drive = await getDriveService();
    if (!drive) {
        console.error('Failed to get Drive service.');
        return;
    }

    const folderId = process.env.DRIVE_FOLDER_ID;
    console.log('Using Folder ID:', folderId);

    try {
        console.log('Starting recursive sync from:', BACKUP_DIR);
        await syncDirectory(drive, BACKUP_DIR, folderId);
        console.log('Sync process completed.');
    } catch (err) {
        console.error('Sync failed:', err.message);
    }
}

testSync();
