import express from "express";
import {
  getAdminDashboard,
  getAdminUser,
  updateUserVerification,
  grantUserEntitlements,
  resetUserPassword,
  updateUserStatus,
  adminEditListing,
  getManualGrantsLog,
} from "../controllers/admin.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// All routes require admin authentication
router.get(
  "/dashboard",
  verifyToken,
  logAdminAction("read", "admin_dashboard", { resourceType: "Dashboard" }),
  getAdminDashboard
);

// User management
router.get(
  "/users/:id",
  verifyToken,
  logAdminAction("read", "admin_user", { resourceType: "User" }),
  getAdminUser
);

router.put(
  "/users/:id/verification",
  verifyToken,
  logAdminAction("update", "user_verification", { resourceType: "Verification" }),
  updateUserVerification
);

router.post(
  "/users/:id/entitlements",
  verifyToken,
  logAdminAction("grant_entitlement", "user_entitlements", { resourceType: "User" }),
  grantUserEntitlements
);

router.post(
  "/users/:id/reset-password",
  verifyToken,
  logAdminAction("update", "user_password", { resourceType: "User" }),
  resetUserPassword
);

router.put(
  "/users/:id/status",
  verifyToken,
  logAdminAction("update", "user_status", { resourceType: "User" }),
  updateUserStatus
);

// Listing management
router.put(
  "/listings/:id",
  verifyToken,
  logAdminAction("update", "listing", { resourceType: "Marketplace" }),
  adminEditListing
);

// Payments
router.get(
  "/payments/manual-grants",
  verifyToken,
  logAdminAction("read", "manual_grants_log", { resourceType: "Log" }),
  getManualGrantsLog
);

export default router;

