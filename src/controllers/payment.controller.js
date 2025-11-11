import Plan from '../models/plan.model.js';
import User from '../models/user.model.js';
import Payment from '../models/payment.model.js';
import { 
  createCheckoutSession, 
  createOneTimeCheckoutSession,
  getStripePriceIdForPlan,
  getStripePriceIdForPost,
  getCheckoutSession,
  createCustomerPortalSession
} from '../libs/stripeService.js';
import { FRONTEND_URL } from '../config.js';

/**
 * Create checkout session for subscription
 */
export const createSubscriptionCheckout = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.userId;
    const user = req.user;

    if (!planId) {
      return res.status(400).json({ message: 'planId is required' });
    }

    // Get plan
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Get Stripe Price ID
    const stripePriceId = plan.stripePriceId || getStripePriceIdForPlan(plan.name);
    if (!stripePriceId) {
      return res.status(400).json({ 
        message: 'Stripe Price ID not configured for this plan. Please contact support.' 
      });
    }

    // Create checkout session
    const successUrl = `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/payment/cancel`;

    const session = await createCheckoutSession(
      stripePriceId,
      userId,
      user.email,
      successUrl,
      cancelUrl
    );

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
      plan: {
        id: plan._id,
        name: plan.name,
        price: plan.price,
      },
    });
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    res.status(500).json({ 
      message: 'Error creating checkout session', 
      error: error.message 
    });
  }
};

/**
 * Create checkout session for pay-per-post
 */
export const createPostCheckout = async (req, res) => {
  try {
    const { category, price } = req.body;
    const userId = req.userId;
    const user = req.user;

    if (!category) {
      return res.status(400).json({ message: 'category is required' });
    }

    // Get Stripe Price ID for category
    const itemPrice = price !== undefined ? parseFloat(price) : null;
    const stripePriceId = getStripePriceIdForPost(category, itemPrice);
    
    if (!stripePriceId) {
      // Free items don't need payment
      return res.status(400).json({ 
        message: 'Free items (price = $0) do not require payment' 
      });
    }

    // Create checkout session
    const successUrl = `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${FRONTEND_URL}/payment/cancel`;

    const session = await createOneTimeCheckoutSession(
      stripePriceId,
      userId,
      user.email,
      successUrl,
      cancelUrl,
      {
        category: category,
        itemPrice: itemPrice !== null ? itemPrice.toString() : '',
      }
    );

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
      category: category,
      price: itemPrice,
    });
  } catch (error) {
    console.error('Error creating post checkout:', error);
    res.status(500).json({ 
      message: 'Error creating checkout session', 
      error: error.message 
    });
  }
};

/**
 * Get checkout session status
 */
export const getCheckoutSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const session = await getCheckoutSession(sessionId);

    res.status(200).json({
      sessionId: session.id,
      status: session.payment_status,
      mode: session.mode,
      customerEmail: session.customer_email,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Error getting checkout session status:', error);
    res.status(500).json({ 
      message: 'Error retrieving checkout session', 
      error: error.message 
    });
  }
};

/**
 * Create customer portal session
 */
export const createCustomerPortal = async (req, res) => {
  try {
    const userId = req.userId;
    
    // Find user's active subscription with Stripe customer ID
    const Subscription = (await import('../models/subscription.model.js')).default;
    const subscription = await Subscription.findOne({
      user: userId,
      status: 'active',
      stripeCustomerId: { $ne: '' }
    });

    if (!subscription || !subscription.stripeCustomerId) {
      return res.status(404).json({ 
        message: 'No active Stripe subscription found. Please create a subscription first.' 
      });
    }

    const returnUrl = `${FRONTEND_URL}/profile`;

    const portalSession = await createCustomerPortalSession(
      subscription.stripeCustomerId,
      returnUrl
    );

    res.status(200).json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    res.status(500).json({ 
      message: 'Error creating customer portal session', 
      error: error.message 
    });
  }
};

/**
 * Create a Zelle payment record
 */
export const createZellePayment = async (req, res) => {
  try {
    const { name, email, amount, reference, planId, zelleEmail, zellePhone } = req.body;
    const userId = req.userId;

    if (!name || !email || !amount) {
      return res.status(400).json({ message: 'Name, email, and amount are required' });
    }

    // Check if planId is provided and valid
    let plan = null;
    if (planId) {
      plan = await Plan.findById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Plan not found' });
      }
    }

    // Create payment record
    const newPayment = new Payment({
      user: userId,
      plan: planId || null,
      name,
      email,
      amount: parseFloat(amount),
      reference: reference || '',
      status: 'pending',
      paymentMethod: 'zelle',
      zelleEmail: zelleEmail || email,
      zellePhone: zellePhone || '',
    });

    await newPayment.save();

    // Populate user and plan for response
    await newPayment.populate('user', 'first_name last_name email');
    if (planId) {
      await newPayment.populate('plan', 'name price');
    }

    res.status(201).json({
      message: 'Payment record created successfully. Your payment will be reviewed by our team.',
      payment: newPayment
    });
  } catch (error) {
    console.error('Error creating Zelle payment:', error);
    res.status(500).json({ 
      message: 'Error creating payment record', 
      error: error.message 
    });
  }
};

/**
 * Get all Zelle payments (Admin only)
 */
export const getAllZellePayments = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { paymentMethod: 'zelle' };
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get payments with pagination
    const payments = await Payment.find(query)
      .populate('user', 'first_name last_name email')
      .populate('plan', 'name price')
      .populate('approvedBy', 'first_name last_name')
      .populate('rejectedBy', 'first_name last_name')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      payments,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching Zelle payments:', error);
    res.status(500).json({ 
      message: 'Error fetching payments', 
      error: error.message 
    });
  }
};

/**
 * Approve a Zelle payment (Admin only)
 */
export const approveZellePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const { notes } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: `Payment is already ${payment.status}` });
    }

    // Update payment status
    payment.status = 'approved';
    payment.approvedBy = adminId;
    payment.approvedAt = new Date();
    payment.notes = notes || payment.notes || '';
    await payment.save();

    // If payment is for a plan, create subscription
    if (payment.plan) {
      const Subscription = (await import('../models/subscription.model.js')).default;
      const plan = await Plan.findById(payment.plan);
      
      if (plan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + plan.durationInDays);

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
          user: payment.user,
          status: 'active'
        });

        if (!existingSubscription) {
          const newSubscription = new Subscription({
            user: payment.user,
            plan: payment.plan,
            startDate,
            endDate,
            status: 'active',
            paymentReference: payment.reference || `Zelle-${payment._id}`,
            memo: `Zelle payment approved - ${payment.name}`,
            postCredits: plan.postCredits || 0,
            unlimitedPosts: plan.unlimitedPosts || false,
          });

          await newSubscription.save();

          // Update user's freeUser status
          await User.findByIdAndUpdate(payment.user, { freeUser: false });
        }
      }
    }

    // Populate for response
    await payment.populate('user', 'first_name last_name email');
    await payment.populate('plan', 'name price');
    await payment.populate('approvedBy', 'first_name last_name');

    res.status(200).json({
      message: 'Payment approved successfully',
      payment
    });
  } catch (error) {
    console.error('Error approving payment:', error);
    res.status(500).json({ 
      message: 'Error approving payment', 
      error: error.message 
    });
  }
};

/**
 * Reject a Zelle payment (Admin only)
 */
export const rejectZellePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const { rejectionReason } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ message: `Payment is already ${payment.status}` });
    }

    // Update payment status
    payment.status = 'rejected';
    payment.rejectedBy = adminId;
    payment.rejectedAt = new Date();
    payment.rejectionReason = rejectionReason || 'Payment rejected by administrator';
    await payment.save();

    // Populate for response
    await payment.populate('user', 'first_name last_name email');
    await payment.populate('plan', 'name price');
    await payment.populate('rejectedBy', 'first_name last_name');

    res.status(200).json({
      message: 'Payment rejected successfully',
      payment
    });
  } catch (error) {
    console.error('Error rejecting payment:', error);
    res.status(500).json({ 
      message: 'Error rejecting payment', 
      error: error.message 
    });
  }
};

