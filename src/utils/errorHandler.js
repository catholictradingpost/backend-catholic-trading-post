import Log from "../models/log.model.js";
import { sendAlertEmail } from "../libs/emailService.js";

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  VALIDATION: "validation",
  AUTHENTICATION: "authentication",
  AUTHORIZATION: "authorization",
  NOT_FOUND: "not_found",
  DATABASE: "database",
  EXTERNAL_API: "external_api",
  FILE_UPLOAD: "file_upload",
  PAYMENT: "payment",
  RATE_LIMIT: "rate_limit",
  SERVER: "server",
  UNKNOWN: "unknown",
};

/**
 * Custom error class with type and context
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, type = ErrorTypes.UNKNOWN, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.context = context;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Log error to database
 */
export const logError = async (error, req = null, userId = null) => {
  try {
    const errorLog = {
      action: "error",
      resource: "system",
      resourceType: "Error",
      user: userId || null,
      details: {
        message: error.message,
        stack: error.stack,
        type: error.type || ErrorTypes.UNKNOWN,
        statusCode: error.statusCode || 500,
        context: error.context || {},
        url: req?.originalUrl || null,
        method: req?.method || null,
        ip: req?.ip || req?.connection?.remoteAddress || null,
        userAgent: req?.headers?.["user-agent"] || null,
      },
      outcome: "failure",
      error: error.message,
      date: new Date(),
    };

    await Log.create(errorLog);
  } catch (logError) {
    console.error("Failed to log error to database:", logError);
  }
};

/**
 * Check if error should trigger alert
 */
const shouldAlert = (error) => {
  // Alert on critical errors
  if (error.statusCode >= 500) {
    return true;
  }

  // Alert on authentication/authorization errors (potential security issue)
  if (
    error.type === ErrorTypes.AUTHENTICATION ||
    error.type === ErrorTypes.AUTHORIZATION
  ) {
    return true;
  }

  // Alert on payment errors
  if (error.type === ErrorTypes.PAYMENT) {
    return true;
  }

  // Alert on database errors
  if (error.type === ErrorTypes.DATABASE) {
    return true;
  }

  return false;
};

/**
 * Send alert email for critical errors
 */
export const sendErrorAlert = async (error, req = null) => {
  if (!shouldAlert(error)) {
    return;
  }

  try {
    const alertEmail = process.env.ALERT_EMAIL || process.env.ADMIN_EMAIL;
    if (!alertEmail) {
      console.warn("No alert email configured. Skipping error alert.");
      return;
    }

    const errorDetails = {
      message: error.message,
      type: error.type || ErrorTypes.UNKNOWN,
      statusCode: error.statusCode || 500,
      url: req?.originalUrl || "N/A",
      method: req?.method || "N/A",
      ip: req?.ip || req?.connection?.remoteAddress || "N/A",
      timestamp: new Date().toISOString(),
      stack: error.stack?.substring(0, 500) || "No stack trace",
    };

    // Send alert email (implement sendAlertEmail in emailService)
    await sendAlertEmail(alertEmail, "Critical Error Alert", errorDetails);
  } catch (alertError) {
    console.error("Failed to send error alert:", alertError);
  }
};

/**
 * Global error handler middleware
 */
export const errorHandler = async (err, req, res, next) => {
  // Get user ID if available
  const userId = req.userId || req.user?._id || null;

  // Log error
  await logError(err, req, userId);

  // Send alert for critical errors
  await sendErrorAlert(err, req);

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Determine error type
  const errorType = err.type || ErrorTypes.UNKNOWN;

  // Prepare error response
  const errorResponse = {
    message: err.message || "Internal server error",
    type: errorType,
    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
      details: err.context,
    }),
  };

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    errorResponse.message = "An unexpected error occurred. Please try again later.";
  }

  res.status(statusCode).json({
    error: errorResponse,
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    ErrorTypes.NOT_FOUND
  );
  next(error);
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  AppError,
  ErrorTypes,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logError,
  sendErrorAlert,
};

