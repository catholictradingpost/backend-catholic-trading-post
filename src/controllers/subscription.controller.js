import Subscription from '../models/subscription.model.js';
import Plan from '../models/plan.model.js';
import Log from '../models/log.model.js';
import { sendSubscriptionGrantEmail } from '../libs/emailService.js';
import mongoose from 'mongoose';

// Create a new subscription (for logged-in user)
export const createSubscription = async (req, res) => {
  try {
    const { planId, paymentReference, memo } = req.body;
    const userId = req.userId; // Assuming userId is set by authentication middleware

    // Check if the user already has an active subscription
    const existingSubscription = await Subscription.findOne({ user: userId, status: 'active' });
    if (existingSubscription) {
      return res.status(400).json({ message: 'You already have an active subscription. Cancel or wait for it to expire before creating a new one.' });
    }

    // Check if the selected plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationInDays);

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Copy plan entitlements to subscription
      const newSubscription = new Subscription({
        user: userId,
        plan: planId,
        startDate,
        endDate,
        status: 'active',
        postCredits: plan.postCredits || 0,
        unlimitedPosts: plan.unlimitedPosts || false,
        paymentReference: paymentReference || '',
        memo: memo || '',
      });

      await newSubscription.save({ session });

      // Update user's freeUser status if they have a paid subscription
      const User = (await import('../models/user.model.js')).default;
      await User.findByIdAndUpdate(userId, { freeUser: false }, { session });

      // Commit transaction
      await session.commitTransaction();

      // Populate subscription for response
      await newSubscription.populate('plan', 'name price durationInDays');

      // Log the action (outside transaction - logging failures shouldn't rollback)
      try {
        await Log.create({
          action: 'create',
          resource: 'subscription',
          user: userId,
        });
      } catch (logError) {
        console.error('Error logging subscription creation:', logError);
      }

      // Send email confirmation (outside transaction - email failures shouldn't rollback)
      try {
        const User = (await import('../models/user.model.js')).default;
        const user = await User.findById(userId);
        if (user && user.email) {
          await sendSubscriptionGrantEmail(user.email, user.first_name, plan, newSubscription);
        }
      } catch (emailError) {
        console.error('Error sending subscription confirmation email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({ message: 'Subscription created successfully', subscription: newSubscription });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error creating subscription', error: error.message });
  }
};

// Admin grant subscription to any user
export const adminGrantSubscription = async (req, res) => {
  try {
    const { userId, planId, paymentReference, memo } = req.body;
    const adminUserId = req.userId;
    const adminUser = req.user;

    // Check admin permissions
    const adminRoles = adminUser.roles.map(role => role.name);
    const isAdmin = adminRoles.includes('Super User') || adminRoles.includes('Admin');
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Unauthorized. Only admins can grant subscriptions.' });
    }

    if (!userId || !planId) {
      return res.status(400).json({ message: 'userId and planId are required' });
    }

    // Check if target user exists
    const User = (await import('../models/user.model.js')).default;
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user already has an active subscription
    const existingSubscription = await Subscription.findOne({ user: userId, status: 'active' });
    if (existingSubscription) {
      return res.status(400).json({ message: 'User already has an active subscription. Cancel or wait for it to expire before creating a new one.' });
    }

    // Check if the selected plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationInDays);

    // Use transaction to ensure data consistency
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create subscription with memo
      const newSubscription = new Subscription({
        user: userId,
        plan: planId,
        startDate,
        endDate,
        status: 'active',
        postCredits: plan.postCredits || 0,
        unlimitedPosts: plan.unlimitedPosts || false,
        paymentReference: paymentReference || '',
        memo: memo || '',
      });

      await newSubscription.save({ session });

      // Update user's freeUser status
      await User.findByIdAndUpdate(userId, { freeUser: false }, { session });

      // Commit transaction
      await session.commitTransaction();

      // Populate subscription for response
      await newSubscription.populate('plan', 'name price durationInDays');

      // Log the action (admin action) - outside transaction
      try {
        await Log.create({
          action: 'create',
          resource: `subscription (granted to user ${userId} by admin ${adminUserId})`,
          user: adminUserId,
        });
      } catch (logError) {
        console.error('Error logging subscription grant:', logError);
      }

      // Send email confirmation to user - outside transaction
      try {
        if (targetUser && targetUser.email) {
          await sendSubscriptionGrantEmail(targetUser.email, targetUser.first_name, plan, newSubscription, memo);
        }
      } catch (emailError) {
        console.error('Error sending subscription grant email:', emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({ 
        message: 'Subscription granted successfully', 
        subscription: newSubscription,
        grantedBy: adminUserId,
        memo: memo || ''
      });
    } catch (error) {
      // Rollback transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ message: 'Error granting subscription', error: error.message });
  }
};

// Update a subscription (renewal or status change)
export const updateSubscription = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Allow only status updates
    if (status) {
      subscription.status = status;
    }

    await subscription.save();

    res.status(200).json({ message: 'Subscription updated successfully', subscription });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subscription', error: error.message });
  }
};

// Cancel or delete a subscription
export const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Mark the subscription as cancelled
    subscription.status = 'cancelled';
    subscription.endDate = new Date(); // Set the end date to now
    await subscription.save();

    res.status(200).json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error cancelling subscription', error: error.message });
  }
};

// Get all subscriptions with filters (userId, status, plan type, startDate, endDate)
export const getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, status, startDate, endDate, planType } = req.query;

    const filters = {};

    // Add filters based on userId, status, planType, and date range
    if (userId) filters.user = userId;
    if (status) filters.status = status;
    if (planType) filters['plan.name'] = planType; // Assuming the plan has a 'nombre' field
    if (startDate && endDate) {
      filters.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Fetch subscriptions with the filters, paginated, and populated plan info
    const subscriptions = await Subscription.find(filters)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'email name') // Populate user details, modify as per your schema
      .populate('plan', 'name') // Populate plan details, assuming it has a 'name' 
      .exec();

    // Get the total number of subscriptions with the filters applied
    const totalCount = await Subscription.countDocuments(filters);

    // Return paginated results
    res.status(200).json({
      data: subscriptions,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving subscriptions', error: error.message });
  }
};

// Get subscription details by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the subscription by its ID
    const subscription = await Subscription.findById(id).populate('plan user'); // Populate plan and user data

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json({ subscription });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription', error: error.message });
  }
};

// Get all subscriptions for a specific user
export const getUserSubscriptions = async (req, res) => {
  try {
    const { userId } = req.params; // Get the userId from the request parameters
    const { page = 1, limit = 10, status, startDate, endDate, planType } = req.query; // Optional filters

    const filters = { user: userId }; // Filter by the userId

    // Apply additional filters if provided
    if (status) filters.status = status;
    if (planType) filters['plan.name'] = planType; // Assuming the plan has a 'name' field
    if (startDate && endDate) {
      filters.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Fetch subscriptions with the filters, paginated, and populated plan info
    const subscriptions = await Subscription.find(filters)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('plan', 'name') // Populate plan details
      .exec();

    // Get the total number of subscriptions for the user with the filters applied
    const totalCount = await Subscription.countDocuments(filters);

    // Return paginated results
    res.status(200).json({
      data: subscriptions,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user subscriptions', error: error.message });
  }
};
