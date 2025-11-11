import express from "express";
import {
  getModerationList,
  addModerationEntry,
  updateModerationEntry,
  deleteModerationEntry,
  bulkImportModerationList,
} from "../controllers/moderationList.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// All routes require admin access
router.get(
  "/",
  verifyToken,
  logAdminAction("read", "moderation_list", { resourceType: "ModerationList" }),
  getModerationList
);

router.post(
  "/",
  verifyToken,
  logAdminAction("create", "moderation_list", { resourceType: "ModerationList" }),
  addModerationEntry
);

router.post(
  "/bulk",
  verifyToken,
  logAdminAction("create", "moderation_list_bulk", { resourceType: "ModerationList" }),
  bulkImportModerationList
);

router.put(
  "/:id",
  verifyToken,
  logAdminAction("update", "moderation_list", { resourceType: "ModerationList" }),
  updateModerationEntry
);

router.delete(
  "/:id",
  verifyToken,
  logAdminAction("delete", "moderation_list", { resourceType: "ModerationList" }),
  deleteModerationEntry
);

export default router;

