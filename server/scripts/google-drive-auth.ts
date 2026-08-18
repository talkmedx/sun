/**
 * One-time Google Drive connect (alternative to Settings UI).
 *
 * 1. Fill GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in server/.env
 * 2. Add redirect URI http://localhost:4100/callback to the OAuth client
 * 3. Run: npm run drive:auth
 * 4. Sign in as vowvanity@gmail.com
 */
import http from 'http';
import { URL } from 'url';
import { google } from 'googleapis';
import { config } from '../config';
import { execute } from '../config/database';

const REDIRECT = 'http://localhost:4100/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
];

async function main() {
  if (!config.googleDrive.clientId || !config.googleDrive.clientSecret) {
    console.error('Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in server/.env first.');
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(
    config.googleDrive.clientId,
    config.googleDrive.clientSecret,
    REDIRECT
  );

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    login_hint: config.googleDrive.accountEmail,
  });

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', REDIRECT);
      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end();
        return;
      }
      const code = url.searchParams.get('code');
      if (!code) throw new Error('Missing code');
      const { tokens } = await oauth2.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error('No refresh token returned. Revoke app access at myaccount.google.com/permissions and retry.');
      }

      oauth2.setCredentials(tokens);
      const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
      const { data } = await oauth2Api.userinfo.get();

      await execute(
        `INSERT INTO settings (setting_key, setting_value, value_type, description)
         VALUES ('google_drive_refresh_token', :token, 'string', 'Google Drive OAuth refresh token')
         ON DUPLICATE KEY UPDATE setting_value = :token, deleted_at = NULL`,
        { token: tokens.refresh_token }
      );
      if (data.email) {
        await execute(
          `INSERT INTO settings (setting_key, setting_value, value_type, description)
           VALUES ('google_drive_email', :email, 'string', 'Connected Google Drive account')
           ON DUPLICATE KEY UPDATE setting_value = :email, deleted_at = NULL`,
          { email: data.email }
        );
      }

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<h2>Google Drive connected as ${data.email || 'your account'}</h2><p>You can close this tab.</p>`);
      console.log(`\n✅ Connected as ${data.email}`);
      console.log('Refresh token saved. Restart the API server if it is already running.\n');
      server.close();
      process.exit(0);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end((err as Error).message);
      console.error(err);
      process.exit(1);
    }
  });

  server.listen(4100, () => {
    console.log('\nOpen this URL and sign in as vowvanity@gmail.com:\n');
    console.log(authUrl);
    console.log('\nWaiting for Google callback on http://localhost:4100/callback ...\n');
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
