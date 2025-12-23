import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env from multiple possible locations
const __dirname = dirname(fileURLToPath(import.meta.url));

// Try loading from api folder first, then project root
dotenvConfig({ path: resolve(__dirname, '../.env') }); // apps/api/.env
dotenvConfig({ path: resolve(__dirname, '../../../.env') }); // project root .env

export const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Server
  port: parseInt(process.env.API_PORT || '3001', 10),
  host: process.env.API_HOST || '0.0.0.0',

  // CORS (allow multiple origins for dev + Pi)
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' 
    ? 'https://familjehubben.vip' 
    : true), // Only allow all origins in development

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

  // Google Calendar
  google: {
    clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/auth/callback',
  },

  // Encryption for OAuth tokens
  encryptionKey: process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-chars!!',

  // Email configuration
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '', // App password for Gmail
    from: process.env.EMAIL_FROM || 'Familjehubben <noreply@familjehubben.vip>',
  },

  // Web Push (VAPID)
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@familjehubben.vip',
  },

  // App URLs
  appUrl: process.env.APP_URL || 'http://localhost:5173',
} as const;

// Validate required config in production
if (!config.isDev) {
  const required = ['SESSION_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
