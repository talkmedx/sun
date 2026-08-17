import fs from 'fs';
import path from 'path';
import { google, drive_v3 } from 'googleapis';
import type { Credentials, OAuth2Client } from 'google-auth-library';
import { RowDataPacket } from 'mysql2';
import { config } from '../config';
import { execute, queryOne } from '../config/database';

const DRIVE_SCOPE = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
];

const SETTING_REFRESH = 'google_drive_refresh_token';
const SETTING_EMAIL = 'google_drive_email';
const SETTING_OAUTH_STATE = 'google_drive_oauth_state';

const folderCache = new Map<string, string>();
let cachedRefreshToken: string | null | undefined;
let cachedEmail: string | null | undefined;

export type DriveUploadItem = {
  file: Express.Multer.File;
  label?: string;
};

function oauthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    config.googleDrive.clientId,
    config.googleDrive.clientSecret,
    config.googleDrive.redirectUri
  );
}

export function hasOAuthAppCredentials(): boolean {
  return Boolean(config.googleDrive.clientId && config.googleDrive.clientSecret);
}

export function hasServiceAccount(): boolean {
  const file = config.googleDrive.serviceAccountFile;
  return Boolean(file && fs.existsSync(path.resolve(process.cwd(), file)));
}

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await queryOne<RowDataPacket>(
      `SELECT setting_value FROM settings WHERE setting_key = :key AND deleted_at IS NULL`,
      { key }
    );
    return row?.setting_value ? String(row.setting_value) : null;
  } catch {
    return null;
  }
}

async function upsertSetting(key: string, value: string, description?: string) {
  await execute(
    `INSERT INTO settings (setting_key, setting_value, value_type, description)
     VALUES (:key, :value, 'string', :description)
     ON DUPLICATE KEY UPDATE setting_value = :value, deleted_at = NULL`,
    { key, value, description: description || null }
  );
}

async function clearSetting(key: string) {
  await execute(`UPDATE settings SET deleted_at = NOW() WHERE setting_key = :key`, { key });
}

async function getStoredRefreshToken(): Promise<string | null> {
  if (config.googleDrive.refreshToken) return config.googleDrive.refreshToken;
  if (cachedRefreshToken !== undefined) return cachedRefreshToken;
  cachedRefreshToken = await getSetting(SETTING_REFRESH);
  return cachedRefreshToken;
}

async function getStoredEmail(): Promise<string | null> {
  if (cachedEmail !== undefined) return cachedEmail;
  cachedEmail = await getSetting(SETTING_EMAIL);
  return cachedEmail;
}

export async function isDriveReady(): Promise<boolean> {
  if (hasServiceAccount()) return true;
  if (!hasOAuthAppCredentials()) return false;
  return Boolean(await getStoredRefreshToken());
}

async function getAuthClient() {
  if (hasServiceAccount()) {
    return new google.auth.GoogleAuth({
      keyFile: path.resolve(process.cwd(), config.googleDrive.serviceAccountFile),
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  }

  const refreshToken = await getStoredRefreshToken();
  if (!hasOAuthAppCredentials() || !refreshToken) {
    return null;
  }

  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

async function getDrive(): Promise<drive_v3.Drive | null> {
  const auth = await getAuthClient();
  if (!auth) return null;
  return google.drive({ version: 'v3', auth });
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Unknown';
}

export function personDisplayName(...parts: Array<string | null | undefined>): string {
  return sanitizeFolderName(parts.filter((p) => p && String(p).trim()).join(' '));
}

export function folderDate(value?: string | Date | null): string {
  const date = value instanceof Date ? value : new Date();
  const use = Number.isNaN(date.getTime()) ? new Date() : date;
  const dd = String(use.getDate()).padStart(2, '0');
  const mm = String(use.getMonth() + 1).padStart(2, '0');
  const yyyy = use.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function studentFolderName(personName: string, date?: string | Date | null): string {
  return sanitizeFolderName(`${personDisplayName(personName)} ${folderDate(date || new Date())}`);
}

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  const cacheKey = `${parentId || 'root'}::${name}`;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  const escaped = escapeDriveQuery(name);
  let q = `name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  q += parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`;

  const found = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 1,
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const existingId = found.data.files?.[0]?.id;
  if (existingId) {
    folderCache.set(cacheKey, existingId);
    return existingId;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  const id = created.data.id;
  if (!id) throw new Error(`Failed to create Drive folder "${name}"`);
  folderCache.set(cacheKey, id);
  return id;
}

async function ensureStudentDocsFolder(
  drive: drive_v3.Drive,
  personName: string
): Promise<{ folderId: string; folderName: string }> {
  const rootId = await findOrCreateFolder(drive, config.googleDrive.rootFolder);
  const folderName = studentFolderName(personName, new Date());
  const folderId = await findOrCreateFolder(drive, folderName, rootId);
  return { folderId, folderName };
}

function uniqueFileName(originalName: string, label?: string): string {
  const base = path.basename(originalName || 'document');
  const prefix = label ? `${sanitizeFolderName(label)} - ` : '';
  return `${prefix}${base}`;
}

async function uploadOne(
  drive: drive_v3.Drive,
  folderId: string,
  item: DriveUploadItem
): Promise<void> {
  const localPath = item.file.path;
  if (!localPath || !fs.existsSync(localPath)) {
    throw new Error(`Local file missing: ${item.file.originalname}`);
  }

  await drive.files.create({
    requestBody: {
      name: uniqueFileName(item.file.originalname, item.label),
      parents: [folderId],
    },
    media: {
      mimeType: item.file.mimetype || 'application/octet-stream',
      body: fs.createReadStream(localPath),
    },
    fields: 'id',
    supportsAllDrives: true,
  });
}

export async function uploadDocuments(opts: {
  files: DriveUploadItem[];
  personName: string;
  date?: string | Date | null;
}): Promise<number> {
  const files = opts.files.filter((f) => f?.file);
  if (!files.length) return 0;

  const drive = await getDrive();
  if (!drive) {
    console.warn('[Google Drive] Not connected — documents saved locally only');
    return 0;
  }

  const personName = personDisplayName(opts.personName);
  const { folderId, folderName } = await ensureStudentDocsFolder(drive, personName);

  let uploaded = 0;
  for (const item of files) {
    try {
      await uploadOne(drive, folderId, item);
      uploaded += 1;
    } catch (err) {
      console.error(
        `[Google Drive] Failed to upload ${item.file.originalname}:`,
        (err as Error).message
      );
    }
  }

  if (uploaded) {
    console.log(
      `[Google Drive] Archived ${uploaded} file(s) → ${config.googleDrive.rootFolder}/${folderName}`
    );
  }
  return uploaded;
}

/** Fire-and-forget so panel saves never fail if Drive is down */
export function archiveUploads(opts: {
  files: Array<{ file?: Express.Multer.File; label?: string }>;
  personName: string;
  date?: string | Date | null;
}): void {
  const files = opts.files.filter((f): f is DriveUploadItem => Boolean(f.file));
  if (!files.length) return;
  void uploadDocuments({ files, personName: opts.personName, date: opts.date }).catch((err) => {
    console.error('[Google Drive] Archive failed:', (err as Error).message);
  });
}

export async function getDriveStatus() {
  const ready = await isDriveReady();
  const email = (await getStoredEmail()) || (ready ? config.googleDrive.accountEmail : null);
  return {
    appConfigured: hasOAuthAppCredentials() || hasServiceAccount(),
    connected: ready,
    email,
    expectedEmail: config.googleDrive.accountEmail,
    rootFolder: config.googleDrive.rootFolder,
    folderPattern: '{student name} {DD-MM-YYYY}',
    usingServiceAccount: hasServiceAccount(),
  };
}

export function createConnectUrl(state: string): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: DRIVE_SCOPE,
    state,
    include_granted_scopes: true,
  });
}

export async function startConnect(): Promise<{ authUrl: string }> {
  if (!hasOAuthAppCredentials()) {
    throw new Error(
      'Google Drive is not configured. Add GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET to server/.env'
    );
  }
  const state = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  await upsertSetting(SETTING_OAUTH_STATE, state, 'Google Drive OAuth CSRF state');
  return { authUrl: createConnectUrl(state) };
}

export async function handleOAuthCallback(code: string, state: string): Promise<string> {
  const expected = await getSetting(SETTING_OAUTH_STATE);
  if (!expected || expected !== state) {
    throw new Error('Invalid Google Drive OAuth state');
  }

  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  await persistTokens(client, tokens);
  await clearSetting(SETTING_OAUTH_STATE);
  folderCache.clear();

  const email = cachedEmail || config.googleDrive.accountEmail;
  return `${config.clientUrl}/sun/settings?drive=connected&email=${encodeURIComponent(email || '')}`;
}

async function persistTokens(client: OAuth2Client, tokens: Credentials) {
  if (!tokens.refresh_token && !config.googleDrive.refreshToken && !cachedRefreshToken) {
    throw new Error('Google did not return a refresh token. Disconnect the app from Google Account permissions and try again.');
  }

  if (tokens.refresh_token) {
    cachedRefreshToken = tokens.refresh_token;
    await upsertSetting(SETTING_REFRESH, tokens.refresh_token, 'Google Drive OAuth refresh token');
  }

  client.setCredentials(tokens);
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    if (data.email) {
      cachedEmail = data.email;
      await upsertSetting(SETTING_EMAIL, data.email, 'Connected Google Drive account');
    }
  } catch (err) {
    console.warn('[Google Drive] Could not read connected email:', (err as Error).message);
  }
}

export async function disconnectDrive() {
  cachedRefreshToken = null;
  cachedEmail = null;
  folderCache.clear();
  await clearSetting(SETTING_REFRESH);
  await clearSetting(SETTING_EMAIL);
}

export async function logDriveStatus() {
  try {
    const status = await getDriveStatus();
    if (status.connected) {
      console.log(`✅ Google Drive connected (${status.email || 'account linked'})`);
    } else if (status.appConfigured) {
      console.log('⚠️  Google Drive app is configured but not connected. Open Settings → Google Drive.');
    } else {
      console.log('ℹ️  Google Drive archive is off. Add CLIENT_ID/SECRET in .env, then connect in Settings.');
    }
  } catch {
    // ignore during boot if DB is not ready
  }
}
