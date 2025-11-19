import { config } from "dotenv";
config();

// Variables de entorno obligatorias
const requiredEnvVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "FRONTEND_URL",
  "USER_EMAIL",
  "USER_NAME",
  "USER_PASSWORD",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT"
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1); // Detener la aplicación si falta variable crítica
  }
});

// Exportar variables para uso en la app
// Railway provides PORT automatically, fallback to 3000 for local development
export const PORT = process.env.PORT || process.env.PORT_BACKEND || 3000;
export const PORT_PYTHON = process.env.PORT_PYTHON || null; // Optional: Python moderation service
export const MONGODB_URI = process.env.MONGODB_URI;
export const TOKEN_SECRET = process.env.JWT_SECRET;
export const FRONTEND_URL = process.env.FRONTEND_URL;
export const USER_EMAIL = process.env.USER_EMAIL;
export const USER_CREDENTIAL = process.env.USER_CREDENTIAL || ""; // opcional
export const USER_NAME = process.env.USER_NAME;
export const USER_PASSWORD = process.env.USER_PASSWORD;

// CORS: Support multiple allowed origins (comma-separated)
// Combines FRONTEND_URL and ALLOWED_ORIGINS for CORS configuration
export const getAllowedOrigins = () => {
  const origins = [];
  
  // Add FRONTEND_URL if it exists
  if (FRONTEND_URL) {
    origins.push(...FRONTEND_URL.split(",").map((o) => o.trim()).filter((o) => o.length > 0));
  }
  
  // Add ALLOWED_ORIGINS if it exists
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter((o) => o.length > 0));
  }
  
  // Remove duplicates
  return [...new Set(origins)];
};

// Variables específicas para ImageKit
export const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
export const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
export const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

// Email Services (optional - supports multiple providers)
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || null;
export const RESEND_API_KEY = process.env.RESEND_API_KEY || null;
// Free SMTP options (fully free, unlimited)
export const GMAIL_USER = process.env.GMAIL_USER || null;
export const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || null;
export const OUTLOOK_USER = process.env.OUTLOOK_USER || null;
export const OUTLOOK_PASSWORD = process.env.OUTLOOK_PASSWORD || null;
export const YAHOO_USER = process.env.YAHOO_USER || null;
export const YAHOO_APP_PASSWORD = process.env.YAHOO_APP_PASSWORD || null;
// Generic SMTP (works with any email provider)
export const SMTP_HOST = process.env.SMTP_HOST || null;
export const SMTP_PORT = process.env.SMTP_PORT || null;
export const SMTP_USER = process.env.SMTP_USER || null;
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || null;
export const SMTP_SECURE = process.env.SMTP_SECURE || null;

// Stripe (opcional pero requerido para pagos)
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || null;
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;

// Zelle payment email (public, no authentication required)
export const ZELLE_PAYMENT_EMAIL = process.env.ZELLE_PAYMENT_EMAIL || 'catholictradingpost@outlook.com';

// JWT Token expiration (default: 24h, can be set in env as "24h", "7d", "30d", etc.)
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
