import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Log from "../models/log.model.js";
import { getUserPostingStatus } from "../middlewares/postingPolicy.middleware.js";
import { sendCreditGrantEmail } from "../libs/emailService.js";

// Get user's credit balance and posting status
export const getUserCredits = async (req, res) => {
  try {
    const userId = req.userId;
    const status = await getUserPostingStatus(userId);

    if (!status) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User credits retrieved successfully",
      credits: status,
    });
  } catch (error) {
    console.error("Error getting user credits:", error);
    res.status(500).json({
      message: "Error retrieving user credits",
      error: error.message,
    });
  }
};

// Add credits to user account (Admin only or payment gateway)
export const addCredits = async (req, res) => {
  try {
    const { userId, amount, memo } = req.body;
    const adminUser = req.user;
    const adminUserId = req.userId;
    const adminRoles = adminUser.roles.map(role => role.name);

    // Only admins or the user themselves can add credits
    const targetUserId = userId || req.userId;
    const isAdmin = adminRoles.includes('Super User') || adminRoles.includes('Admin');

    if (!isAdmin && targetUserId !== req.userId.toString()) {
      return res.status(403).json({ message: "Unauthorized to add credits to this user" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid credit amount. Must be greater than 0." });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousBalance = user.postCredits || 0;
    user.postCredits = previousBalance + amount;
    await user.save();

    // Log the action
    try {
      await Log.create({
        action: 'create',
        resource: `credits (${amount} credits added to user ${targetUserId}${isAdmin ? ` by admin ${adminUserId}` : ''}${memo ? ` - Memo: ${memo}` : ''})`,
        user: adminUserId,
      });
    } catch (logError) {
      console.error('Error logging credit addition:', logError);
    }

    // Send email confirmation if admin granted credits to another user
    if (isAdmin && targetUserId !== adminUserId.toString()) {
      try {
        if (user && user.email) {
          await sendCreditGrantEmail(user.email, user.first_name, amount, user.postCredits, memo);
        }
      } catch (emailError) {
        console.error('Error sending credit grant email:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      message: `Successfully added ${amount} credit(s) to user account`,
      newBalance: user.postCredits,
      previousBalance,
      memo: memo || '',
    });
  } catch (error) {
    console.error("Error adding credits:", error);
    res.status(500).json({
      message: "Error adding credits",
      error: error.message,
    });
  }
};

// Add credits to subscription (Admin only)
export const addSubscriptionCredits = async (req, res) => {
  try {
    const { subscriptionId, amount, memo } = req.body;
    const adminUser = req.user;
    const adminUserId = req.userId;
    const adminRoles = adminUser.roles.map(role => role.name);

    if (!adminRoles.includes('Super User') && !adminRoles.includes('Admin')) {
      return res.status(403).json({ message: "Unauthorized. Only admins can add subscription credits." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid credit amount. Must be greater than 0." });
    }

    const subscription = await Subscription.findById(subscriptionId).populate('user');
    if (!subscription) {
      return res.status(404).json({ message: "Subscription not found" });
    }

    const previousBalance = subscription.postCredits || 0;
    subscription.postCredits = previousBalance + amount;
    await subscription.save();

    // Log the action
    try {
      await Log.create({
        action: 'update',
        resource: `subscription credits (${amount} credits added to subscription ${subscriptionId} by admin ${adminUserId}${memo ? ` - Memo: ${memo}` : ''})`,
        user: adminUserId,
      });
    } catch (logError) {
      console.error('Error logging subscription credit addition:', logError);
    }

    // Send email confirmation
    try {
      const user = subscription.user;
      if (user && user.email) {
        await sendCreditGrantEmail(user.email, user.first_name, amount, subscription.postCredits, memo, true);
      }
    } catch (emailError) {
      console.error('Error sending subscription credit grant email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      message: `Successfully added ${amount} credit(s) to subscription`,
      subscription,
      previousBalance,
      memo: memo || '',
    });
  } catch (error) {
    console.error("Error adding subscription credits:", error);
    res.status(500).json({
      message: "Error adding subscription credits",
      error: error.message,
    });
  }
};

