import csrf from "csurf";
import { FRONTEND_URL, getAllowedOrigins } from "../config.js";

/**
 * CSRF Protection Configuration
 * Note: CSRF is typically not needed for stateless JWT APIs,
 * but can be enabled for cookie-based sessions
 */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

/**
 * Secure cookie configuration
 */
export const cookieConfig = {
  httpOnly: true, // Prevents XSS attacks
  secure: process.env.NODE_ENV === "production", // HTTPS only in production
  sameSite: "strict", // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.COOKIE_DOMAIN || undefined, // Set if using subdomains
};

/**
 * CORS configuration with security headers
 */
export const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    console.log("CORS Check - Origin:", origin);
    console.log("CORS Check - Allowed Origins:", allowedOrigins);

    // Allow mobile apps, Postman, same-server calls
    if (!origin) {
      return callback(null, true);
    }

    // 🚀 Allow ANY origin if explicitly configured
    if (allowedOrigins.includes("*")) {
      return callback(null, true);
    }

    // 🚀 If domain matches allowed list → allow
    if (allowedOrigins.includes(origin)) {
      console.log("CORS: Allowed origin:", origin);
      return callback(null, true);
    }

    // ❌ Otherwise block
    console.error("CORS: Blocked origin:", origin);
    return callback(new Error(`CORS blocked: ${origin} not allowed.`));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
    "Accept",
    "Origin",
  ],

  exposedHeaders: ["X-Total-Count", "X-Page", "X-Per-Page"],

  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // X-Content-Type-Options: Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // X-Frame-Options: Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // X-XSS-Protection: Enable XSS filter
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Referrer-Policy: Control referrer information
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // Permissions-Policy: Control browser features
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  next();
};

export default {
  csrfProtection,
  cookieConfig,
  corsConfig,
  securityHeaders,
};

