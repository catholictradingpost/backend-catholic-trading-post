import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../config.js';

if (!STRIPE_SECRET_KEY) {
  console.warn('Stripe secret key not configured. Stripe functionality will be disabled.');
}

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
}) : null;

/**
 * Stripe Product/Price IDs mapping
 * These should match the products created in Stripe Dashboard
 */
export const STRIPE_PRODUCTS = {
  // Subscription plans
  SUB_1M: 'sub_1m', // 1 Month Plan - $70
  SUB_3M: 'sub_3m', // 3 Month Plan - $180
  SUB_6M: 'sub_6m', // 6 Month Plan - $300
  
  // Pay-per-post products
  POST_AUTO: 'post_auto', // Automobiles - $10
  POST_MISC: 'post_misc', // Art/Misc - $4
};

/**
 * Get Stripe price ID for a plan
 * @param {string} planName - Plan name (e.g., "1 Month Plan")
 * @returns {string|null} - Stripe Price ID or null
 */
export function getStripePriceIdForPlan(planName) {
  const mapping = {
    '1 Month Plan': STRIPE_PRODUCTS.SUB_1M,
    '3 Month Plan': STRIPE_PRODUCTS.SUB_3M,
    '6 Month Plan': STRIPE_PRODUCTS.SUB_6M,
  };
  return mapping[planName] || null;
}

/**
 * Get Stripe price ID for post category
 * @param {string} category - Category name
 * @param {number} price - Item price (0 for free items)
 * @returns {string|null} - Stripe Price ID or null
 */
export function getStripePriceIdForPost(category, price = null) {
  // Free items don't need Stripe payment
  if (price !== null && price === 0) {
    return null;
  }
  
  // Automobiles
  if (category === 'Cars' || category === 'Automobiles') {
    return STRIPE_PRODUCTS.POST_AUTO;
  }
  
  // Art/Misc (default)
  return STRIPE_PRODUCTS.POST_MISC;
}

/**
 * Create Stripe checkout session for subscription
 * @param {string} priceId - Stripe Price ID
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} successUrl - Success redirect URL
 * @param {string} cancelUrl - Cancel redirect URL
 * @returns {Promise<Stripe.Checkout.Session>}
 */
export async function createCheckoutSession(priceId, userId, userEmail, successUrl, cancelUrl) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // For subscription plans
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        type: 'subscription',
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          userId: userId.toString(),
        },
      },
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe checkout session for one-time payment (pay-per-post)
 * @param {string} priceId - Stripe Price ID
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} successUrl - Success redirect URL
 * @param {string} cancelUrl - Cancel redirect URL
 * @param {object} metadata - Additional metadata (category, itemPrice, etc.)
 * @returns {Promise<Stripe.Checkout.Session>}
 */
export async function createOneTimeCheckoutSession(priceId, userId, userEmail, successUrl, cancelUrl, metadata = {}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(),
        type: 'pay_per_post',
        ...metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe one-time checkout session:', error);
    throw error;
  }
}

/**
 * Retrieve Stripe checkout session
 * @param {string} sessionId - Stripe Session ID
 * @returns {Promise<Stripe.Checkout.Session>}
 */
export async function getCheckoutSession(sessionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session;
  } catch (error) {
    console.error('Error retrieving Stripe checkout session:', error);
    throw error;
  }
}

/**
 * Create Stripe customer portal session
 * @param {string} customerId - Stripe Customer ID
 * @param {string} returnUrl - Return URL after portal session
 * @returns {Promise<Stripe.BillingPortal.Session>}
 */
export async function createCustomerPortalSession(customerId, returnUrl) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe customer portal session:', error);
    throw error;
  }
}

/**
 * Retrieve Stripe subscription
 * @param {string} subscriptionId - Stripe Subscription ID
 * @returns {Promise<Stripe.Subscription>}
 */
export async function getStripeSubscription(subscriptionId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error retrieving Stripe subscription:', error);
    throw error;
  }
}

/**
 * Retrieve Stripe payment intent
 * @param {string} paymentIntentId - Stripe Payment Intent ID
 * @returns {Promise<Stripe.PaymentIntent>}
 */
export async function getStripePaymentIntent(paymentIntentId) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving Stripe payment intent:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * @param {string} payload - Raw request body
 * @param {string} signature - Stripe signature header
 * @param {string} webhookSecret - Webhook secret
 * @returns {Stripe.Event}
 */
export function verifyWebhookSignature(payload, signature, webhookSecret) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    return event;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
}

export default stripe;

