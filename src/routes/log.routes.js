import express from "express";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { getLogs, getAuditLogs, getAuditLogStats } from "../controllers/log.controller.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// Get logs (existing)
router.get("/all", verifyToken, getLogs);

// Get audit logs (admin only)
router.get(
  "/audit",
  verifyToken,
  logAdminAction("read", "audit_log", { resourceType: "Log" }),
  getAuditLogs
);

// Get audit log statistics (admin only)
router.get(
  "/audit/stats",
  verifyToken,
  logAdminAction("read", "audit_log_stats", { resourceType: "Log" }),
  getAuditLogStats
);

export default router;
