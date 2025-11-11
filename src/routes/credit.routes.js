import express from "express";
import { getUserCredits, addCredits, addSubscriptionCredits } from "../controllers/credit.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// Get user's credits (authenticated users)
router.get("/", verifyToken, getUserCredits);

// Add credits to user account (user themselves or admin)
router.post(
  "/add",
  verifyToken,
  logAdminAction("grant_entitlement", "credits", {
    resourceType: "User",
    resourceIdFrom: "userId",
    includeRequestBody: true,
  }),
  addCredits
);

// Add credits to subscription (admin only)
router.post(
  "/subscription/add",
  verifyToken,
  logAdminAction("grant_entitlement", "subscription_credits", {
    resourceType: "Subscription",
    resourceIdFrom: "subscriptionId",
    includeRequestBody: true,
  }),
  addSubscriptionCredits
);

export default router;

