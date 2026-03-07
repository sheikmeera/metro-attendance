const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

/**
 * Returns an authorized Google Drive service instance using OAuth2
 */
async function getDriveService() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        console.warn('[Drive] Missing OAuth2 credentials in .env. Sync disabled.');
        return null;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            'https://developers.google.com/oauthplayground' // Default redirect URI
        );

        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });

        return google.drive({ version: 'v3', auth: oauth2Client });
    } catch (err) {
        console.error('[Drive] Auth error:', err.message);
        return null;
    }
}

/**
 * Helper to find or create a folder in Drive
 */
async function getOrCreateFolder(drive, name, parentId) {
    try {
        const q = `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;
        const res = await drive.files.list({ q, fields: 'files(id, name)' });

        if (res.data.files.length > 0) {
            return res.data.files[0].id;
        }

        const folderMetadata = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        };
        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });
        return folder.data.id;
    } catch (err) {
        console.error(`[Drive] Error creating folder "${name}":`, err.message);
        throw err;
    }
}

/**
 * Helper to upload or update a file in Drive
 */
async function uploadFile(drive, filePath, folderId) {
    try {
        const fileName = path.basename(filePath);
        if (fileName === 'temp' || fileName.includes('.gitignore')) return;

        const media = {
            mimeType: filePath.endsWith('.db') ? 'application/x-sqlite3' : 'application/pdf',
            body: fs.createReadStream(filePath),
        };

        const q = `name='${fileName}' and '${folderId}' in parents and trashed=false`;
        const check = await drive.files.list({ q, fields: 'files(id)' });

        if (check.data.files.length > 0) {
            console.log(`[Drive] Updating existing file: ${fileName}`);
            await drive.files.update({
                fileId: check.data.files[0].id,
                media,
            });
        } else {
            console.log(`[Drive] Creating new file: ${fileName}`);
            await drive.files.create({
                resource: { name: fileName, parents: [folderId] },
                media,
                fields: 'id',
            });
        }
    } catch (err) {
        console.error(`[Drive] Error uploading file "${filePath}":`, err.message);
    }
}

/**
 * Recursively syncs a local directory to Google Drive
 */
async function syncDirectory(drive, localPath, driveFolderId) {
    if (!fs.existsSync(localPath)) return;
    const items = fs.readdirSync(localPath);

    for (const item of items) {
        const fullPath = path.join(localPath, item);
        const stats = fs.statSync(fullPath);

        if (stats.isDirectory()) {
            const newDriveFolderId = await getOrCreateFolder(drive, item, driveFolderId);
            await syncDirectory(drive, fullPath, newDriveFolderId);
        } else {
            await uploadFile(drive, fullPath, driveFolderId);
        }
    }
}

module.exports = { getDriveService, syncDirectory };
