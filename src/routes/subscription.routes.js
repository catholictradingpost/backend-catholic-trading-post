import express from 'express';
import { 
  createSubscription,
  adminGrantSubscription,
  updateSubscription,
  deleteSubscription,
  getUserSubscriptions,
  getSubscriptionById,
  getAllSubscriptions
} from '../controllers/subscription.controller.js';
import { 
  verifyToken
} from "../middlewares/authJwt.middleware.js";
import { checkPermission } from "../middlewares/checkPermission.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";

const router = express.Router();

// Route to create a new subscription (accessible by authenticated users)
router.post('/create', verifyToken, createSubscription);

// Route for admin to grant subscription to any user (admin only)
router.post(
  '/admin/grant',
  verifyToken,
  checkPermission("subscription", "create"),
  logAdminAction("grant_entitlement", "subscription", {
    resourceType: "Subscription",
    resourceIdFrom: "userId",
    includeRequestBody: true,
  }),
  adminGrantSubscription
);

// Route to update the subscription (status, benefits, etc.) (accessible by authenticated users)
router.put('/update/:id', verifyToken, checkPermission("subscription", "update"), updateSubscription);

// Route to cancel a subscription (accessible by authenticated users)
router.delete('/cancel/:id', verifyToken, deleteSubscription);

// Route to get all subscriptions for a specific user (accessible by authenticated users)
router.get('/all', verifyToken, checkPermission("subscription", "read"), getAllSubscriptions);

// Route to get all subscriptions for a specific user (accessible by authenticated users)
router.get('/user/:userId', verifyToken, getUserSubscriptions);

// Route to get subscription details by ID (accessible by authenticated users)
router.get('/getById/:id', verifyToken, getSubscriptionById);

export default router;
