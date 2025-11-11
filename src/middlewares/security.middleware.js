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
    // Get allowed origins from getAllowedOrigins() which combines FRONTEND_URL and ALLOWED_ORIGINS
    const allowedOrigins = getAllowedOrigins();
    
    // Log for debugging (remove in production if needed)
    console.log("CORS Check - Origin:", origin);
    console.log("CORS Check - Allowed Origins:", allowedOrigins);
    
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV === "development") {
      console.log("CORS: Allowing request with no origin (development mode)");
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      console.log("CORS: Allowing origin:", origin);
      callback(null, true);
    } else {
      console.error("CORS: Blocked origin:", origin);
      console.error("CORS: Allowed origins:", allowedOrigins);
      // Return false instead of error to let cors middleware handle it properly
      callback(null, false);
    }
  },
  credentials: true, // Allow cookies
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
  maxAge: 86400, // 24 hours
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

