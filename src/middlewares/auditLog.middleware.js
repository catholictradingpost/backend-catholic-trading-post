import Log from "../models/log.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

/**
 * Enhanced audit log middleware
 * Tracks all admin actions with detailed information
 */
export const auditLog = (action, resource, options = {}) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = function (data) {
      // Log after response is sent
      res.on("finish", async () => {
        try {
          const userId = req.userId || req.user?._id;
          if (!userId) {
            return; // Don't log if no user
          }

          // Get user role
          let userRole = null;
          if (req.user) {
            const user = await User.findById(userId).populate("roles").lean();
            if (user && user.roles && user.roles.length > 0) {
              userRole = user.roles.map((r) => r.name || r).join(", ");
            }
          }

          // Determine outcome
          let outcome = "success";
          if (res.statusCode >= 400) {
            outcome = res.statusCode >= 500 ? "failure" : "partial";
          }

          // Extract resource ID from params or body
          let resourceId = null;
          if (options.resourceIdFrom) {
            resourceId =
              req.params[options.resourceIdFrom] ||
              req.body[options.resourceIdFrom] ||
              req.query[options.resourceIdFrom];
          } else {
            resourceId = req.params.id || req.body.id || req.params.resourceId;
          }

          // Extract details (before/after for updates)
          const details = {
            ...(options.details || {}),
            requestBody: options.includeRequestBody
              ? sanitizeRequestBody(req.body)
              : undefined,
            params: req.params,
            query: req.query,
            responseStatus: res.statusCode,
          };

          // Get IP address
          const ipAddress =
            req.ip ||
            req.headers["x-forwarded-for"] ||
            req.connection.remoteAddress;

          // Get user agent
          const userAgent = req.headers["user-agent"];

          // Create audit log entry
          await Log.create({
            action: action || req.method.toLowerCase(),
            resource: resource || options.resource || "unknown",
            resourceId: resourceId ? new mongoose.Types.ObjectId(resourceId) : null,
            resourceType: options.resourceType || null,
            user: userId,
            userRole: userRole,
            ipAddress: ipAddress,
            userAgent: userAgent,
            details: details,
            outcome: outcome,
            error:
              outcome !== "success" && data?.error
                ? data.error
                : outcome !== "success" && data?.message
                ? data.message
                : null,
            date: new Date(),
          });
        } catch (error) {
          console.error("Error creating audit log:", error);
          // Don't fail the request if logging fails
        }
      });

      return originalJson(data);
    };

    next();
  };
};

/**
 * Sanitize request body to remove sensitive information
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "creditCard",
    "ssn",
    "socialSecurity",
  ];

  const sanitized = { ...body };
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = "[REDACTED]";
    }
  }

  return sanitized;
}

/**
 * Log admin action specifically
 */
export const logAdminAction = (action, resource, options = {}) => {
  return async (req, res, next) => {
    // Check if user is admin
    const userId = req.userId || req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role === "Super User" ||
        role.toLowerCase().includes("admin") ||
        role.toLowerCase().includes("moderator")
    );

    if (!isAdmin && !options.allowNonAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // Use audit log middleware
    return auditLog(action, resource, {
      ...options,
      resourceType: options.resourceType,
    })(req, res, next);
  };
};

export default {
  auditLog,
  logAdminAction,
};

