const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function uploadTest() {
    try {
        console.log('Testing upload to folder:', FOLDER_ID);
        const res = await drive.files.create({
            requestBody: { name: 'test_connection.txt', parents: [FOLDER_ID] },
            media: { mimeType: 'text/plain', body: 'Connection Successful!' }
        });
        console.log('UPLOAD SUCCESS! File ID:', res.data.id);
    } catch (err) {
        console.error('UPLOAD FAILED:', err.message);
        if (err.response) console.error('Data:', err.response.data);
    }
}

uploadTest();
