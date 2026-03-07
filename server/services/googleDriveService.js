/**
 * services/googleDriveService.js
 * Handles OAuth-based uploads to Google Drive.
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// These should be set in your .env file
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost';
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

if (REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
}

const drive = google.drive({
    version: 'v3',
    auth: oauth2Client
});

/**
 * Ensures a folder structure exists on Drive and returns the ID of the leaf folder.
 * @param {string} folderPath Slash-separated path (e.g., "Daily/2026/03/07")
 * @returns {string} The ID of the final folder
 */
async function getOrCreateFolderPath(folderPath) {
    let parentId = FOLDER_ID;
    if (!folderPath) return parentId;

    const parts = folderPath.split('/').filter(p => p.length > 0);

    for (const part of parts) {
        const q = `name = '${part}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        try {
            const res = await drive.files.list({ q, fields: 'files(id, name)' });
            if (res.data.files && res.data.files.length > 0) {
                parentId = res.data.files[0].id;
            } else {
                const folderMetadata = {
                    name: part,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId]
                };
                const folder = await drive.files.create({
                    requestBody: folderMetadata,
                    fields: 'id'
                });
                parentId = folder.data.id;
            }
        } catch (err) {
            console.error(`[Drive] Error resolving folder "${part}":`, err.message);
            throw err;
        }
    }
    return parentId;
}

/**
 * Uploads a file to a specific Google Drive folder.
 * @param {string} filePath Absolute path to the local file
 * @param {string} fileName Name for the file on Drive
 * @param {string} folderPath Optional subfolder path (e.g., "Daily/2026/03")
 */
async function uploadToDrive(filePath, fileName, folderPath = '') {
    if (!CLIENT_ID || !REFRESH_TOKEN) {
        console.warn('[Drive] Google Drive OAuth settings missing. Skipping upload.');
        return;
    }

    try {
        const parentId = await getOrCreateFolderPath(folderPath);

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [parentId],
            },
            media: {
                mimeType: 'application/pdf',
                body: fs.createReadStream(filePath),
            },
        });
        console.log(`[Drive] Uploaded file: ${fileName} to "${folderPath || 'root'}" (ID: ${response.data.id})`);
        return response.data.id;
    } catch (error) {
        console.error(`[Drive] Upload error for ${fileName}:`, error.message);
    }
}

module.exports = { uploadToDrive };
