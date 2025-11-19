import express from 'express';
import { verifyToken } from '../middlewares/authJwt.middleware.js';
import User from '../models/user.model.js';
import {
  createSubscriptionCheckout,
  createPostCheckout,
  getCheckoutSessionStatus,
  createCustomerPortal,
  createZellePayment,
  getAllZellePayments,
  approveZellePayment,
  rejectZellePayment,
  getZellePaymentEmail,
} from '../controllers/payment.controller.js';
import { handleStripeWebhook } from '../controllers/stripeWebhook.controller.js';

const router = express.Router();

// Note: Webhook route is registered in app.js before JSON middleware
// to receive raw body for signature verification

// Checkout session routes (require authentication)
router.post('/checkout/subscription', verifyToken, createSubscriptionCheckout);
router.post('/checkout/post', verifyToken, createPostCheckout);
router.get('/checkout/session/:sessionId', verifyToken, getCheckoutSessionStatus);

// Customer portal (require authentication)
router.post('/portal', verifyToken, createCustomerPortal);

// Public endpoint to get Zelle payment email (no authentication required)
router.get('/zelle/email', getZellePaymentEmail);

// Admin check middleware for payment routes
const checkAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userDoc = await User.findById(user._id).populate("roles");
    const roleNames = userDoc.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role === "Super User" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin access:", error);
    return res.status(500).json({ message: "Error checking admin access", error: error.message });
  }
};

// Zelle payment routes
router.post('/zelle', verifyToken, createZellePayment); // Create Zelle payment record
router.get('/zelle/all', verifyToken, checkAdmin, getAllZellePayments); // Get all Zelle payments (Admin only)
router.put('/zelle/:id/approve', verifyToken, checkAdmin, approveZellePayment); // Approve payment (Admin only)
router.put('/zelle/:id/reject', verifyToken, checkAdmin, rejectZellePayment); // Reject payment (Admin only)

export default router;

