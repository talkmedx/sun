import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5001', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3001',

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'komals_makeovers',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
    dir: process.env.UPLOAD_DIR || 'uploads',
  },

  googleDrive: {
    clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_DRIVE_REDIRECT_URI ||
      'http://localhost:5001/api/v1/settings/google-drive/callback',
    refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '',
    serviceAccountFile: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE || '',
    rootFolder: process.env.GOOGLE_DRIVE_ROOT_FOLDER || "komal's makeover",
    accountEmail: process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL || 'vowvanity@gmail.com',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '2000', 10),
  },
} as const;
