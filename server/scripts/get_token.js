/**
 * server/scripts/get_token.js
 * Run this to get your GOOGLE_DRIVE_REFRESH_TOKEN
 */
const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID || '526584615906-i880km6op9khikganikarh28smvqem9o.apps.googleusercontent.com';
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost'; // Matches your Google Cloud console setting

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.metadata.readonly'];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
});

console.log('\n1. Open this URL in your browser:\n', authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('\n2. After authorizing, copy the "Authorization code" from the page and paste it here: ', (code) => {
    rl.close();
    oauth2Client.getToken(code, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        const refreshToken = token.refresh_token;
        console.log('\n--- SUCCESS! ---');
        console.log('Refresh Token:', refreshToken);

        // Automatically update .env
        const envPath = path.join(__dirname, '..', '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/GOOGLE_DRIVE_REFRESH_TOKEN=.*/, `GOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`);
        } else {
            envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN=${refreshToken}`;
        }
        fs.writeFileSync(envPath, envContent);

        console.log('\n[Saved] Refresh token has been automatically saved to your .env file!');
        console.log('You can now run "node test_backup.js" to verify.');
    });
});
