import ContentReport from "../models/contentReport.model.js";
import Marketplace from "../models/marketplace.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Event from "../models/event.model.js";
import mongoose from "mongoose";

/**
 * Report content (listing, post, user, message, etc.)
 * POST /api/report/content
 */
export const reportContent = async (req, res) => {
  try {
    const { contentType, contentId, reason, description } = req.body;
    const reporterId = req.userId;

    if (!contentType || !contentId || !reason) {
      return res.status(400).json({
        message: "Content type, content ID, and reason are required",
      });
    }

    // Validate content type
    const validContentTypes = ["listing", "post", "user", "message", "comment", "event"];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    // Map content type to model
    const modelMap = {
      listing: Marketplace,
      post: Post,
      user: User,
      message: Message,
      event: Event,
      comment: Post, // Comments might be posts or separate model
    };

    const ContentModel = modelMap[contentType];
    if (!ContentModel) {
      return res.status(400).json({ message: "Content model not found" });
    }

    // Verify content exists
    const content = await ContentModel.findById(contentId);
    if (!content) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Check if user already reported this content
    const existingReport = await ContentReport.findOne({
      reporter: reporterId,
      contentId: contentId,
      contentType: contentType,
    });

    if (existingReport) {
      return res.status(400).json({
        message: "You have already reported this content",
        reportId: existingReport._id,
      });
    }

    // Determine priority based on reason
    let priority = "medium";
    if (["scam", "harassment"].includes(reason)) {
      priority = "high";
    } else if (reason === "spam") {
      priority = "low";
    }

    // Create report
    const report = new ContentReport({
      reporter: reporterId,
      contentType: contentType,
      contentId: contentId,
      contentModel: ContentModel.modelName,
      reason: reason,
      description: description || "",
      priority: priority,
      status: "pending",
    });

    await report.save();
    await report.populate("reporter", "first_name last_name email");

    res.status(201).json({
      message: "Content reported successfully",
      report,
    });
  } catch (error) {
    console.error("Error reporting content:", error);
    res.status(500).json({
      message: "Error reporting content",
      error: error.message,
    });
  }
};

/**
 * Get moderation queue (pending reports)
 * GET /api/report/queue
 */
export const getModerationQueue = async (req, res) => {
  try {
    const { status = "pending", priority, contentType, page = 1, limit = 20 } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (contentType) {
      filter.contentType = contentType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, reports] = await Promise.all([
      ContentReport.countDocuments(filter),
      ContentReport.find(filter)
        .populate("reporter", "first_name last_name email")
        .populate("assignedTo", "first_name last_name")
        .populate("reviewedBy", "first_name last_name")
        .sort({ priority: -1, createdAt: 1 }) // High priority first, then oldest first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    // Populate content details
    const reportsWithContent = await Promise.all(
      reports.map(async (report) => {
        let content = null;
        try {
          const modelMap = {
            listing: Marketplace,
            post: Post,
            user: User,
            message: Message,
            event: Event,
            comment: Post,
          };

          const ContentModel = modelMap[report.contentType];
          if (ContentModel) {
            content = await ContentModel.findById(report.contentId).lean();
          }
        } catch (error) {
          console.error(`Error loading content for report ${report._id}:`, error);
        }

        return {
          ...report,
          content,
        };
      })
    );

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      reports: reportsWithContent,
    });
  } catch (error) {
    console.error("Error getting moderation queue:", error);
    res.status(500).json({
      message: "Error getting moderation queue",
      error: error.message,
    });
  }
};

/**
 * Get single report
 * GET /api/report/:id
 */
export const getReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await ContentReport.findById(id)
      .populate("reporter", "first_name last_name email")
      .populate("assignedTo", "first_name last_name")
      .populate("reviewedBy", "first_name last_name");

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Load content
    const modelMap = {
      listing: Marketplace,
      post: Post,
      user: User,
      message: Message,
      event: Event,
      comment: Post,
    };

    const ContentModel = modelMap[report.contentType];
    let content = null;
    if (ContentModel) {
      content = await ContentModel.findById(report.contentId);
    }

    res.status(200).json({
      report: {
        ...report.toObject(),
        content,
      },
    });
  } catch (error) {
    console.error("Error getting report:", error);
    res.status(500).json({
      message: "Error getting report",
      error: error.message,
    });
  }
};

/**
 * Assign report to moderator
 * PUT /api/report/:id/assign
 */
export const assignReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    const userId = req.userId;

    if (!assignedTo) {
      return res.status(400).json({ message: "Moderator ID is required" });
    }

    const report = await ContentReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.assignedTo = assignedTo;
    report.status = "reviewing";
    await report.save();

    await report.populate("assignedTo", "first_name last_name");

    res.status(200).json({
      message: "Report assigned successfully",
      report,
    });
  } catch (error) {
    console.error("Error assigning report:", error);
    res.status(500).json({
      message: "Error assigning report",
      error: error.message,
    });
  }
};

/**
 * Resolve report (moderator action)
 * PUT /api/report/:id/resolve
 */
export const resolveReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, resolutionNotes, status } = req.body;
    const userId = req.userId;

    const report = await ContentReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.reviewedBy = userId;
    report.reviewedAt = new Date();
    report.status = status || "resolved";
    if (resolution) report.resolution = resolution;
    if (resolutionNotes) report.resolutionNotes = resolutionNotes;

    await report.save();
    await report.populate("reviewedBy", "first_name last_name");

    res.status(200).json({
      message: "Report resolved successfully",
      report,
    });
  } catch (error) {
    console.error("Error resolving report:", error);
    res.status(500).json({
      message: "Error resolving report",
      error: error.message,
    });
  }
};

/**
 * Get user statistics (existing - keep for compatibility)
 */
export const getUserStatistics = async (req, res) => {
  try {
    const { page = 1, limit = 10, year = new Date().getFullYear(), reportType = 'full' } = req.query;
    const skip = (page - 1) * limit;

    const query = year ? { createdAt: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) } } : {};

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query).skip(skip).limit(limit);

    if (reportType === 'graph') {
      // Report for graphs: users per month.
      const usersPerMonth = await User.aggregate([
        { $match: query },
        { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } }
      ]);

      return res.status(200).json({ total: totalUsers, perMonth: usersPerMonth });
    }

    res.status(200).json({ total: totalUsers, users });
  } catch (error) {
    console.error("Error fetching user statistics:", error);
    res.status(500).json({ message: "Error fetching user statistics", error: error.message });
  }
};

/**
 * Get post statistics (existing - keep for compatibility)
 */
export const getPostStatistics = async (req, res) => {
  try {
    const { page = 1, limit = 10, reportType = 'full' } = req.query;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const posts = await Post.find().skip(skip).limit(limit);

    if (reportType === 'graph') {
       // Report for graphs: posts by type
      const postsByType = await Post.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]);

      return res.status(200).json({ total: totalPosts, byType: postsByType });
    }

    res.status(200).json({ total: totalPosts, posts });
  } catch (error) {
    console.error("Error fetching post statistics:", error);
    res.status(500).json({ message: "Error fetching post statistics", error: error.message });
  }
};

/**
 * Get subscription statistics (existing - keep for compatibility)
 */
export const getSubscriptionStatistics = async (req, res) => {
  try {
    const { page = 1, limit = 10, reportType = 'full' } = req.query;
    const skip = (page - 1) * limit;

    const Subscription = (await import("../models/subscription.model.js")).default;
    const totalSubscriptions = await Subscription.countDocuments();
    const subscriptions = await Subscription.find().skip(skip).limit(limit);

    if (reportType === 'graph') {
      // Report for graphs: subscriptions by status.
      const subscriptionsByStatus = await Subscription.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      return res.status(200).json({ total: totalSubscriptions, byStatus: subscriptionsByStatus });
    }

    res.status(200).json({ total: totalSubscriptions, subscriptions });
  } catch (error) {
    console.error("Error fetching subscription statistics:", error);
    res.status(500).json({ message: "Error fetching subscription statistics", error: error.message });
  }
};
