const { google } = require('googleapis');
require('dotenv').config();

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getAuthUrl() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost'
    );

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('\n--- STEP 1: AUTHORIZE APP ---');
    console.log('1. Click the link below and log in with your Gmail.');
    console.log('2. After you click "Allow", the page will "fail to load" or show an error.');
    console.log('3. LOOK AT THE URL in your browser. It will look like: http://localhost/?code=4/0Af...&scope=...');
    console.log('4. COPY the part after "code=" and before "&scope=".\n');
    console.log('AUTHORIZATION LINK:\n', url, '\n');
}

getAuthUrl();
