import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "../../logs");
const ERROR_LOG = path.join(LOG_DIR, "error.log");
const ACCESS_LOG = path.join(LOG_DIR, "access.log");

// Ensure log directory exists
fs.ensureDirSync(LOG_DIR);

/**
 * Logger utility for structured logging
 */
export const logger = {
  /**
   * Log error
   */
  error: (message, error = null, context = {}) => {
    const logEntry = {
      level: "error",
      timestamp: new Date().toISOString(),
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        ...error,
      } : null,
      context,
    };

    console.error(JSON.stringify(logEntry));
    
    // Write to error log file
    fs.appendFileSync(ERROR_LOG, JSON.stringify(logEntry) + "\n");
  },

  /**
   * Log warning
   */
  warn: (message, context = {}) => {
    const logEntry = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    console.warn(JSON.stringify(logEntry));
  },

  /**
   * Log info
   */
  info: (message, context = {}) => {
    const logEntry = {
      level: "info",
      timestamp: new Date().toISOString(),
      message,
      context,
    };

    console.log(JSON.stringify(logEntry));
  },

  /**
   * Log access
   */
  access: (req, res, responseTime) => {
    const logEntry = {
      level: "access",
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    // Write to access log file
    fs.appendFileSync(ACCESS_LOG, JSON.stringify(logEntry) + "\n");
  },
};

export default logger;

