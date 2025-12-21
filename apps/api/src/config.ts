import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Server
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',

  // CORS (frontend URL)
  corsOrigin: process.env.WEB_URL || 'http://localhost:3000',

  // Security
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  familyPassword: process.env.FAMILY_PASSWORD || 'changeme',

  // Database (PostgreSQL)
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'family_hub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },

  // Google Calendar (Phase 5)
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback',
  },

  // Encryption for OAuth tokens
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars!!',
} as const;

// Validate required config in production
if (!config.isDev) {
  const required = ['SESSION_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
