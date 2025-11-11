import User from "../models/user.model.js";
import Verification from "../models/verification.model.js";
import Questionnaire from "../models/questionnaire.model.js";
import Marketplace from "../models/marketplace.model.js";
import Subscription from "../models/subscription.model.js";
import Plan from "../models/plan.model.js";
import Log from "../models/log.model.js";
import ContentReport from "../models/contentReport.model.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationApprovalEmail, sendVerificationDenialEmail } from "../libs/emailService.js";

/**
 * Enhanced Dashboard Stats with Health Checks
 * GET /api/admin/dashboard
 */
export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User Statistics
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      verifiedUsers,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: "active" }),
      User.countDocuments({ status: "suspended" }),
      User.countDocuments({ status: "banned" }),
      Verification.countDocuments({ status: "approved" }),
      User.countDocuments({ createdAt: { $gte: last7Days } }),
      User.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    // Listing Statistics
    const [
      totalListings,
      activeListings,
      pendingListings,
      rejectedListings,
      soldListings,
      newListingsLast7Days,
    ] = await Promise.all([
      Marketplace.countDocuments(),
      Marketplace.countDocuments({ status: "active" }),
      Marketplace.countDocuments({ status: "pending" }),
      Marketplace.countDocuments({ status: "rejected" }),
      Marketplace.countDocuments({ status: "sold" }),
      Marketplace.countDocuments({ createdAt: { $gte: last7Days } }),
    ]);

    // Subscription Statistics
    const [
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
    ] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: "active" }),
      Subscription.countDocuments({ status: "expired" }),
    ]);

    // Moderation Statistics
    const [
      pendingReports,
      resolvedReports,
      totalReports,
    ] = await Promise.all([
      ContentReport.countDocuments({ status: "pending" }),
      ContentReport.countDocuments({ status: "resolved" }),
      ContentReport.countDocuments(),
    ]);

    // Payment Statistics (manual grants)
    const manualGrants = await Log.countDocuments({
      action: "grant_entitlement",
      resource: { $regex: /credit|subscription/i },
    });

    // Health Checks
    const healthChecks = {
      database: {
        status: "healthy",
        message: "Database connection active",
      },
      email: {
        status: process.env.SENDGRID_API_KEY ? "healthy" : "warning",
        message: process.env.SENDGRID_API_KEY
          ? "SendGrid configured"
          : "SendGrid API key not configured",
      },
      stripe: {
        status: process.env.STRIPE_SECRET_KEY ? "healthy" : "warning",
        message: process.env.STRIPE_SECRET_KEY
          ? "Stripe configured"
          : "Stripe not configured",
      },
      imagekit: {
        status:
          process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY
            ? "healthy"
            : "warning",
        message:
          process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY
            ? "ImageKit configured"
            : "ImageKit not fully configured",
      },
    };

    // Recent Activity
    const recentActivity = await Log.find()
      .populate("user", "first_name last_name email")
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // Chart Data (last 7 days)
    const dailyStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          banned: bannedUsers,
          verified: verifiedUsers,
          newLast7Days: newUsersLast7Days,
          newLast30Days: newUsersLast30Days,
        },
        listings: {
          total: totalListings,
          active: activeListings,
          pending: pendingListings,
          rejected: rejectedListings,
          sold: soldListings,
          newLast7Days: newListingsLast7Days,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          expired: expiredSubscriptions,
        },
        moderation: {
          pendingReports,
          resolvedReports,
          totalReports,
        },
        payments: {
          manualGrants,
        },
      },
      healthChecks,
      recentActivity,
      chartData: dailyStats,
    });
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    res.status(500).json({
      message: "Error getting admin dashboard",
      error: error.message,
    });
  }
};

/**
 * Get user by ID with full details
 * GET /api/admin/users/:id
 */
export const getAdminUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate("roles", "name")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get verification status
    const verification = await Verification.findOne({ user: id });
    const questionnaire = await Questionnaire.findOne({ user: id });

    // Get user's subscriptions
    const subscriptions = await Subscription.find({ user: id })
      .populate("plan", "name price durationInDays")
      .lean();

    // Get user's listings
    const listings = await Marketplace.find({ owner: id })
      .select("title status price category createdAt")
      .lean();

    // Get user's audit log entries
    const auditLogs = await Log.find({ user: id })
      .sort({ date: -1 })
      .limit(20)
      .lean();

    res.status(200).json({
      user: {
        ...user,
        verification: verification || null,
        questionnaire: questionnaire || null,
        subscriptions,
        listings: {
          total: listings.length,
          items: listings,
        },
        recentActivity: auditLogs,
      },
    });
  } catch (error) {
    console.error("Error getting admin user:", error);
    res.status(500).json({
      message: "Error getting admin user",
      error: error.message,
    });
  }
};

/**
 * Verify/Reject user verification
 * PUT /api/admin/users/:id/verification
 */
export const updateUserVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'
    const adminId = req.userId;

    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
    }

    const verification = await Verification.findOne({ user: id });
    if (!verification) {
      return res.status(404).json({ message: "Verification not found" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (action === "approve") {
      verification.status = "approved";
      verification.observation = reason || "";
    } else {
      verification.status = "denied";
      verification.observation = reason || "Verification denied";
    }

    verification.reviewedBy = adminId;
    verification.reviewedAt = new Date();
    await verification.save();

    // Send email notification
    try {
      if (action === "approve") {
        await sendVerificationApprovalEmail(
          user.email,
          user.first_name || "there"
        );
      } else {
        const correctionDeadline = new Date();
        correctionDeadline.setDate(correctionDeadline.getDate() + 7);
        await sendVerificationDenialEmail(
          user.email,
          user.first_name || "there",
          reason || "The information provided did not meet our verification requirements.",
          correctionDeadline
        );
      }
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
    }

    // Log action
    await Log.create({
      action: action === "approve" ? "approve" : "reject",
      resource: "verification",
      resourceId: verification._id,
      resourceType: "Verification",
      user: adminId,
      details: { userId: id, action, reason },
    });

    res.status(200).json({
      message: `Verification ${action === "approve" ? "approved" : "rejected"} successfully`,
      verification,
    });
  } catch (error) {
    console.error("Error updating user verification:", error);
    res.status(500).json({
      message: "Error updating user verification",
      error: error.message,
    });
  }
};

/**
 * Grant entitlements to user
 * POST /api/admin/users/:id/entitlements
 */
export const grantUserEntitlements = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, planId, credits, memo } = req.body; // type: 'subscription' or 'credits'
    const adminId = req.userId;

    if (!["subscription", "credits"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Use 'subscription' or 'credits'",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (type === "subscription") {
      if (!planId) {
        return res.status(400).json({ message: "planId is required for subscription" });
      }

      const plan = await Plan.findById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + plan.durationInDays);

      const subscription = new Subscription({
        user: id,
        plan: planId,
        startDate,
        endDate,
        status: "active",
        postCredits: plan.postCredits || 0,
        unlimitedPosts: plan.unlimitedPosts || false,
        paymentReference: "admin_grant",
        memo: memo || "Granted by admin",
      });

      await subscription.save();
      user.freeUser = false;
      await user.save();

      // Log action
      await Log.create({
        action: "grant_entitlement",
        resource: "subscription",
        resourceId: subscription._id,
        resourceType: "Subscription",
        user: adminId,
        details: { userId: id, planId, memo },
      });

      res.status(200).json({
        message: "Subscription granted successfully",
        subscription,
      });
    } else {
      // Grant credits
      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Valid credits amount is required" });
      }

      const previousBalance = user.postCredits || 0;
      user.postCredits = previousBalance + credits;
      await user.save();

      // Log action
      await Log.create({
        action: "grant_entitlement",
        resource: "credits",
        resourceId: user._id,
        resourceType: "User",
        user: adminId,
        details: { userId: id, credits, previousBalance, newBalance: user.postCredits, memo },
      });

      res.status(200).json({
        message: "Credits granted successfully",
        credits: {
          added: credits,
          previousBalance,
          newBalance: user.postCredits,
        },
      });
    }
  } catch (error) {
    console.error("Error granting user entitlements:", error);
    res.status(500).json({
      message: "Error granting user entitlements",
      error: error.message,
    });
  }
};

/**
 * Reset user password (admin)
 * POST /api/admin/users/:id/reset-password
 */
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword, sendEmail } = req.body;
    const adminId = req.userId;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate new password if not provided
    const password = newPassword || crypto.randomBytes(12).toString("hex");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    // Log action
    await Log.create({
      action: "update",
      resource: "user_password",
      resourceId: user._id,
      resourceType: "User",
      user: adminId,
      details: { userId: id, passwordReset: true, emailSent: sendEmail || false },
    });

    res.status(200).json({
      message: "Password reset successfully",
      newPassword: sendEmail ? undefined : password, // Only return if not sending email
      emailSent: sendEmail || false,
    });
  } catch (error) {
    console.error("Error resetting user password:", error);
    res.status(500).json({
      message: "Error resetting user password",
      error: error.message,
    });
  }
};

/**
 * Ban/Suspend user
 * PUT /api/admin/users/:id/status
 */
export const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, expiresAt } = req.body; // status: 'active', 'suspended', 'banned'
    const adminId = req.userId;

    if (!["active", "suspended", "banned"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use 'active', 'suspended', or 'banned'",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const previousStatus = user.status;
    user.status = status;

    if (status === "banned" || status === "suspended") {
      user.banInfo = {
        bannedAt: new Date(),
        bannedBy: adminId,
        banReason: reason || "",
        banExpiresAt: expiresAt ? new Date(expiresAt) : null,
      };
    } else {
      // Clear ban info when reactivating
      user.banInfo = {
        bannedAt: null,
        bannedBy: null,
        banReason: "",
        banExpiresAt: null,
      };
    }

    await user.save();

    // Log action
    await Log.create({
      action: status === "banned" ? "ban" : status === "suspended" ? "suspend" : "update",
      resource: "user_status",
      resourceId: user._id,
      resourceType: "User",
      user: adminId,
      details: { userId: id, previousStatus, newStatus: status, reason, expiresAt },
    });

    res.status(200).json({
      message: `User ${status} successfully`,
      user: {
        _id: user._id,
        email: user.email,
        status: user.status,
        banInfo: user.banInfo,
      },
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({
      message: "Error updating user status",
      error: error.message,
    });
  }
};

/**
 * Admin edit listing
 * PUT /api/admin/listings/:id
 */
export const adminEditListing = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminId = req.userId;

    const listing = await Marketplace.findById(id);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Allow admin to update any field
    const allowedFields = [
      "title",
      "description",
      "category",
      "price",
      "currency",
      "status",
      "condition",
      "location",
      "autoDetails",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        listing[field] = updateData[field];
      }
    });

    // Update moderation if provided
    if (updateData.moderation) {
      listing.moderation = {
        ...listing.moderation,
        ...updateData.moderation,
        reviewedBy: adminId,
        reviewedAt: new Date(),
      };
    }

    await listing.save();

    // Log action
    await Log.create({
      action: "update",
      resource: "listing",
      resourceId: listing._id,
      resourceType: "Marketplace",
      user: adminId,
      details: { listingId: id, updates: updateData },
    });

    res.status(200).json({
      message: "Listing updated successfully",
      listing,
    });
  } catch (error) {
    console.error("Error editing listing:", error);
    res.status(500).json({
      message: "Error editing listing",
      error: error.message,
    });
  }
};

/**
 * Get manual payment grants log
 * GET /api/admin/payments/manual-grants
 */
export const getManualGrantsLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, startDate, endDate } = req.query;

    const filter = {
      action: "grant_entitlement",
      resource: { $regex: /credit|subscription/i },
    };

    if (userId) {
      const detailsFilter = { "details.userId": userId };
      // Also check if resourceId matches userId
      filter.$or = [
        detailsFilter,
        { resourceId: new mongoose.Types.ObjectId(userId) },
      ];
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, logs] = await Promise.all([
      Log.countDocuments(filter),
      Log.find(filter)
        .populate("user", "first_name last_name email")
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      grants: logs,
    });
  } catch (error) {
    console.error("Error getting manual grants log:", error);
    res.status(500).json({
      message: "Error getting manual grants log",
      error: error.message,
    });
  }
};

