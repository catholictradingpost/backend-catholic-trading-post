import { verifyWebhookSignature, getStripeSubscription, getStripePaymentIntent } from '../libs/stripeService.js';
import { STRIPE_WEBHOOK_SECRET } from '../config.js';
import Subscription from '../models/subscription.model.js';
import Plan from '../models/plan.model.js';
import User from '../models/user.model.js';
import Log from '../models/log.model.js';
import { sendSubscriptionGrantEmail, sendCreditGrantEmail, sendReceiptEmail } from '../libs/emailService.js';
import { getPostingCost } from '../utils/pricingConfig.js';

/**
 * Handle Stripe webhook events
 */
export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify webhook signature
    // req.body is already a Buffer from express.raw() middleware
    const payload = req.body;
    event = verifyWebhookSignature(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle checkout.session.completed event
 */
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata?.userId;
  const type = session.metadata?.type;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`User not found: ${userId}`);
    return;
  }

  if (type === 'subscription') {
    // Handle subscription checkout
    const subscription = await getStripeSubscription(session.subscription);
    
    // Find plan by Stripe Price ID
    const plan = await Plan.findOne({ stripePriceId: subscription.items.data[0].price.id });
    if (!plan) {
      console.error(`Plan not found for Stripe Price ID: ${subscription.items.data[0].price.id}`);
      return;
    }

    // Check if subscription already exists
    let dbSubscription = await Subscription.findOne({ 
      stripeSubscriptionId: subscription.id 
    });

    if (!dbSubscription) {
      // Create new subscription
      const startDate = new Date(subscription.current_period_start * 1000);
      const endDate = new Date(subscription.current_period_end * 1000);

      dbSubscription = new Subscription({
        user: userId,
        plan: plan._id,
        startDate,
        endDate,
        status: subscription.status === 'active' ? 'active' : 'paused',
        paymentReference: session.payment_intent || '',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        postCredits: plan.postCredits || 0,
        unlimitedPosts: plan.unlimitedPosts || false,
      });

      await dbSubscription.save();

      // Update user's freeUser status
      await User.findByIdAndUpdate(userId, { freeUser: false });

      // Log the action
      try {
        await Log.create({
          action: 'create',
          resource: `subscription (Stripe: ${subscription.id})`,
          user: userId,
        });
      } catch (logError) {
        console.error('Error logging subscription creation:', logError);
      }

      // Send email confirmation
      try {
        await sendSubscriptionGrantEmail(user.email, user.first_name, plan, dbSubscription);
        
        // Send receipt email
        await sendReceiptEmail(user.email, user.first_name, {
          description: `Subscription: ${plan.name}`,
          amount: plan.price,
          paymentId: session.payment_intent || subscription.id,
          date: Math.floor(startDate.getTime() / 1000),
          invoiceUrl: session.invoice_url || null,
          subscriptionDetails: {
            planName: plan.name,
            startDate: Math.floor(startDate.getTime() / 1000),
            endDate: Math.floor(endDate.getTime() / 1000),
          },
        });
      } catch (emailError) {
        console.error('Error sending subscription confirmation email:', emailError);
      }
    }
  } else if (type === 'pay_per_post') {
    // Handle pay-per-post checkout
    const paymentIntentId = session.payment_intent;
    const category = session.metadata?.category;
    const itemPrice = session.metadata?.itemPrice ? parseFloat(session.metadata.itemPrice) : null;

    if (paymentIntentId) {
      const paymentIntent = await getStripePaymentIntent(paymentIntentId);
      
      // Grant credits based on category and price using pricing config
      // This ensures consistency with the rest of the codebase
      const creditAmount = getPostingCost(category, itemPrice);
      
      user.postCredits = (user.postCredits || 0) + creditAmount;
      await user.save();

      // Log the action
      try {
        await Log.create({
          action: 'create',
          resource: `credits (Stripe payment: ${paymentIntentId}, ${creditAmount} credits)`,
          user: userId,
        });
      } catch (logError) {
        console.error('Error logging credit addition:', logError);
      }

      // Send email confirmation
      try {
        await sendCreditGrantEmail(user.email, user.first_name, creditAmount, user.postCredits);
        
        // Send receipt email
        await sendReceiptEmail(user.email, user.first_name, {
          description: `Pay-per-post: ${category}${itemPrice ? ` ($${itemPrice})` : ''}`,
          amount: creditAmount,
          paymentId: paymentIntentId,
          date: Math.floor(Date.now() / 1000),
          invoiceUrl: session.invoice_url || null,
        });
      } catch (emailError) {
        console.error('Error sending credit grant email:', emailError);
      }
    }
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(stripeSubscription) {
  const dbSubscription = await Subscription.findOne({ 
    stripeSubscriptionId: stripeSubscription.id 
  });

  if (dbSubscription) {
    const startDate = new Date(stripeSubscription.current_period_start * 1000);
    const endDate = new Date(stripeSubscription.current_period_end * 1000);

    dbSubscription.startDate = startDate;
    dbSubscription.endDate = endDate;
    dbSubscription.status = stripeSubscription.status === 'active' ? 'active' : 
                           stripeSubscription.status === 'canceled' ? 'cancelled' : 
                           stripeSubscription.status === 'past_due' ? 'paused' : 'active';
    dbSubscription.stripeCustomerId = stripeSubscription.customer;

    await dbSubscription.save();

    // Log the update
    try {
      await Log.create({
        action: 'update',
        resource: `subscription (Stripe: ${stripeSubscription.id})`,
        user: dbSubscription.user,
      });
    } catch (logError) {
      console.error('Error logging subscription update:', logError);
    }
  }
}

/**
 * Handle subscription.deleted event
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  const dbSubscription = await Subscription.findOne({ 
    stripeSubscriptionId: stripeSubscription.id 
  });

  if (dbSubscription) {
    dbSubscription.status = 'cancelled';
    dbSubscription.endDate = new Date();
    await dbSubscription.save();

    // Log the cancellation
    try {
      await Log.create({
        action: 'update',
        resource: `subscription cancelled (Stripe: ${stripeSubscription.id})`,
        user: dbSubscription.user,
      });
    } catch (logError) {
      console.error('Error logging subscription cancellation:', logError);
    }
  }
}

/**
 * Handle payment_intent.succeeded event (for one-time payments)
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  const userId = paymentIntent.metadata?.userId;
  
  if (!userId) {
    return;
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`User not found: ${userId}`);
    return;
  }

  // Credits are already granted in checkout.session.completed
  // This is just for logging/confirmation
  console.log(`Payment intent succeeded for user ${userId}: ${paymentIntent.id}`);
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice) {
  // Handle successful subscription renewal payment
  if (invoice.subscription) {
    const dbSubscription = await Subscription.findOne({ 
      stripeSubscriptionId: invoice.subscription 
    });

    if (dbSubscription) {
      // Update subscription period if needed
      const stripeSubscription = await getStripeSubscription(invoice.subscription);
      const startDate = new Date(stripeSubscription.current_period_start * 1000);
      const endDate = new Date(stripeSubscription.current_period_end * 1000);

      dbSubscription.startDate = startDate;
      dbSubscription.endDate = endDate;
      dbSubscription.status = 'active';
      await dbSubscription.save();

      // Log renewal
      try {
        await Log.create({
          action: 'update',
          resource: `subscription renewed (Stripe: ${invoice.subscription})`,
          user: dbSubscription.user,
        });
      } catch (logError) {
        console.error('Error logging subscription renewal:', logError);
      }
    }
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice) {
  if (invoice.subscription) {
    const dbSubscription = await Subscription.findOne({ 
      stripeSubscriptionId: invoice.subscription 
    });

    if (dbSubscription) {
      // Mark subscription as past_due or paused
      dbSubscription.status = 'paused';
      await dbSubscription.save();

      // Log payment failure
      try {
        await Log.create({
          action: 'update',
          resource: `subscription payment failed (Stripe: ${invoice.subscription})`,
          user: dbSubscription.user,
        });
      } catch (logError) {
        console.error('Error logging payment failure:', logError);
      }
    }
  }
}

