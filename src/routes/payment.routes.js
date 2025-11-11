import express from 'express';
import { verifyToken } from '../middlewares/authJwt.middleware.js';
import { checkPermission } from '../middlewares/checkPermission.middleware.js';
import {
  createSubscriptionCheckout,
  createPostCheckout,
  getCheckoutSessionStatus,
  createCustomerPortal,
  createZellePayment,
  getAllZellePayments,
  approveZellePayment,
  rejectZellePayment,
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

// Zelle payment routes
router.post('/zelle', verifyToken, createZellePayment); // Create Zelle payment record
router.get('/zelle/all', verifyToken, checkPermission('subscription', 'read'), getAllZellePayments); // Get all Zelle payments (Admin only)
router.put('/zelle/:id/approve', verifyToken, checkPermission('subscription', 'update'), approveZellePayment); // Approve payment (Admin only)
router.put('/zelle/:id/reject', verifyToken, checkPermission('subscription', 'update'), rejectZellePayment); // Reject payment (Admin only)

export default router;

