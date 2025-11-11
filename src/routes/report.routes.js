// routes/report.routes.js
import express from "express";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAction } from "../middlewares/log.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";
import {
  getUserStatistics,
  getPostStatistics,
  getSubscriptionStatistics,
  reportContent,
  getModerationQueue,
  getReport,
  assignReport,
  resolveReport,
} from "../controllers/report.controller.js";

const router = express.Router();

// Content reporting (authenticated users)
router.post("/content", verifyToken, reportContent);

// Moderation queue (admin/moderator only)
router.get(
  "/queue",
  verifyToken,
  logAdminAction("read", "moderation_queue", { resourceType: "Report" }),
  getModerationQueue
);

// Get single report
router.get(
  "/:id",
  verifyToken,
  logAdminAction("read", "report", { resourceType: "Report" }),
  getReport
);

// Assign report to moderator
router.put(
  "/:id/assign",
  verifyToken,
  logAdminAction("update", "report", { resourceType: "Report" }),
  assignReport
);

// Resolve report
router.put(
  "/:id/resolve",
  verifyToken,
  logAdminAction("resolve_report", "report", { resourceType: "Report" }),
  resolveReport
);

// Statistics reports (existing - keep for compatibility)
router.get("/users", verifyToken, logAction("report", "user"), getUserStatistics);
router.get("/posts", verifyToken, logAction("report", "post"), getPostStatistics);
router.get("/subscriptions", verifyToken, logAction("report", "subscription"), getSubscriptionStatistics);

export default router;
