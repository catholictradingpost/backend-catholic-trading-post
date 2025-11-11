import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Plan from "../models/plan.model.js";
import { getPostingCost } from "../utils/pricingConfig.js";

/**
 * Posting Policy Middleware
 * Enforces: free always free, pay-per-post consumes credits, subscriptions = unlimited
 */
export const checkPostingPolicy = async (req, res, next) => {
  try {
    const user = req.user;
    const userId = user._id;

    // Get fresh user data
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ message: "User not found" });
    }

    // Policy 1: Check for active subscription with unlimited posts
    const activeSubscription = await Subscription.findOne({
      user: userId,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate('plan');

    if (activeSubscription && activeSubscription.unlimitedPosts) {
      // User has active subscription with unlimited posts - allow posting
      req.postingPolicy = {
        type: 'unlimited_subscription',
        subscription: activeSubscription,
      };
      return next();
    }

    // Policy 2: Free users always free (no credit deduction)
    if (userDoc.freeUser) {
      // Free users can post without consuming credits
      req.postingPolicy = {
        type: 'free_user',
        deductCredits: false,
      };
      return next();
    }

    // Policy 3: Pay-per-post users need credits
    // Check if user has subscription with credits
    let availableCredits = userDoc.postCredits || 0;
    
    // Get category and price from request body for category-based pricing
    const category = req.body.category || req.body.type;
    const itemPrice = req.body.price !== undefined ? parseFloat(req.body.price) : null;
    
    // Calculate credit cost based on category and price
    const categoryBasedCost = getPostingCost(category, itemPrice);
    
    if (activeSubscription) {
      // Add subscription credits to available credits
      availableCredits += activeSubscription.postCredits || 0;
      
      // Use category-based pricing if available, otherwise use plan's creditCostPerPost
      const plan = activeSubscription.plan;
      const creditCost = categoryBasedCost !== null ? categoryBasedCost : (plan?.creditCostPerPost || 1);
      
      if (availableCredits < creditCost) {
        return res.status(403).json({
          message: `Insufficient credits. You need ${creditCost} credit(s) to create this post. You have ${availableCredits} credit(s).`,
          availableCredits,
          requiredCredits: creditCost,
          category: category || 'N/A',
          itemPrice: itemPrice !== null ? itemPrice : 'N/A',
        });
      }

      // Store policy info for post controller to deduct credits
      req.postingPolicy = {
        type: 'pay_per_post',
        subscription: activeSubscription,
        deductCredits: true,
        creditCost,
        availableCredits,
        category: category || null,
        itemPrice: itemPrice !== null ? itemPrice : null,
      };
      return next();
    }

    // Policy 4: Pay-per-post without subscription (using user credits)
    // Use category-based pricing if available, otherwise default to 1
    const creditCost = categoryBasedCost !== null ? categoryBasedCost : 1;
    
    if (availableCredits < creditCost) {
      return res.status(403).json({
        message: `Insufficient credits. You need ${creditCost} credit(s) to create this post. You have ${availableCredits} credit(s).`,
        availableCredits,
        requiredCredits: creditCost,
        category: category || 'N/A',
        itemPrice: itemPrice !== null ? itemPrice : 'N/A',
      });
    }

    // Store policy info for deduction
    req.postingPolicy = {
      type: 'pay_per_post',
      deductCredits: true,
      creditCost,
      availableCredits,
      category: category || null,
      itemPrice: itemPrice !== null ? itemPrice : null,
    };

    next();
  } catch (error) {
    console.error("Error checking posting policy:", error);
    return res.status(500).json({
      message: "Error checking posting policy",
      error: error.message,
    });
  }
};

/**
 * Get user's posting status and available credits
 */
export const getUserPostingStatus = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return null;
    }

    const activeSubscription = await Subscription.findOne({
      user: userId,
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).populate('plan');

    let availableCredits = user.postCredits || 0;
    let unlimitedPosts = false;
    let creditCostPerPost = 1;

    if (activeSubscription) {
      availableCredits += activeSubscription.postCredits || 0;
      unlimitedPosts = activeSubscription.unlimitedPosts || false;
      
      if (activeSubscription.plan) {
        creditCostPerPost = activeSubscription.plan.creditCostPerPost || 1;
      }
    }

    return {
      freeUser: user.freeUser || false,
      availableCredits,
      unlimitedPosts,
      creditCostPerPost,
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
      // Note: Actual cost depends on category, use getPostingCost() with category
    };
  } catch (error) {
    console.error("Error getting user posting status:", error);
    return null;
  }
};

