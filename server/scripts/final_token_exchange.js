const { google } = require('googleapis');
require('dotenv').config();

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost';
const code = '4/0AfrIepAUncr8u9eBTNTLT2DxQiBiqp54Id-gFL8G19577P91cCYpuvYCMZp6LJCLhW6SUA';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oauth2Client.getToken(code, (err, token) => {
    if (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
    console.log('---TOKEN_START---');
    console.log(token.refresh_token);
    console.log('---TOKEN_END---');
});
