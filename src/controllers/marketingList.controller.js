import MarketingList from "../models/marketingList.model.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import Marketplace from "../models/marketplace.model.js";
import RSVP from "../models/rsvp.model.js";
import EmailUnsubscribe from "../models/emailUnsubscribe.model.js";
import crypto from "crypto";

/**
 * Get all marketing lists
 * GET /api/marketing-list
 */
export const getMarketingLists = async (req, res) => {
  try {
    const { category, active, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.active = active === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, lists] = await Promise.all([
      MarketingList.countDocuments(filter),
      MarketingList.find(filter)
        .populate("createdBy", "first_name last_name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      lists,
    });
  } catch (error) {
    console.error("Error getting marketing lists:", error);
    res.status(500).json({
      message: "Error getting marketing lists",
      error: error.message,
    });
  }
};

/**
 * Create marketing list
 * POST /api/marketing-list
 */
export const createMarketingList = async (req, res) => {
  try {
    const { name, description, category, segmentation, settings, members } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ message: "List name is required" });
    }

    const list = new MarketingList({
      name,
      description,
      category: category || "custom",
      segmentation: segmentation || {},
      settings: {
        autoUpdate: settings?.autoUpdate !== undefined ? settings.autoUpdate : true,
        updateFrequency: settings?.updateFrequency || "daily",
        excludeUnsubscribed: settings?.excludeUnsubscribed !== undefined 
          ? settings.excludeUnsubscribed 
          : true,
      },
      members: members || [],
      createdBy: userId,
      active: true,
    });

    await list.save();

    // Update member count if static list
    if (list.category === "custom" && list.members.length > 0) {
      list.metadata.totalMembers = list.members.length;
      await list.save();
    }

    res.status(201).json({
      message: "Marketing list created successfully",
      list,
    });
  } catch (error) {
    console.error("Error creating marketing list:", error);
    res.status(500).json({
      message: "Error creating marketing list",
      error: error.message,
    });
  }
};

/**
 * Update marketing list
 * PUT /api/marketing-list/:id
 */
export const updateMarketingList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, segmentation, settings, active } = req.body;

    const list = await MarketingList.findById(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    if (name) list.name = name;
    if (description !== undefined) list.description = description;
    if (category) list.category = category;
    if (segmentation) list.segmentation = { ...list.segmentation, ...segmentation };
    if (settings) {
      list.settings = {
        ...list.settings,
        ...settings,
      };
    }
    if (active !== undefined) list.active = active;

    await list.save();

    res.status(200).json({
      message: "Marketing list updated successfully",
      list,
    });
  } catch (error) {
    console.error("Error updating marketing list:", error);
    res.status(500).json({
      message: "Error updating marketing list",
      error: error.message,
    });
  }
};

/**
 * Delete marketing list
 * DELETE /api/marketing-list/:id
 */
export const deleteMarketingList = async (req, res) => {
  try {
    const { id } = req.params;

    const list = await MarketingList.findByIdAndDelete(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    res.status(200).json({
      message: "Marketing list deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting marketing list:", error);
    res.status(500).json({
      message: "Error deleting marketing list",
      error: error.message,
    });
  }
};

/**
 * Get list members (with segmentation applied)
 * GET /api/marketing-list/:id/members
 */
export const getListMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 100, includeUnsubscribed = "false" } = req.query;

    const list = await MarketingList.findById(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    let members = [];

    // If static list, return members directly
    if (list.category === "custom" && list.members.length > 0) {
      const memberIds = list.members.map((m) => m.user);
      const query = { _id: { $in: memberIds } };

      // Exclude unsubscribed if setting is enabled
      if (list.settings.excludeUnsubscribed && includeUnsubscribed === "false") {
        const unsubscribed = await EmailUnsubscribe.find({
          user: { $in: memberIds },
          $or: [
            { unsubscribeType: "all" },
            { unsubscribeType: "marketing" },
          ],
        }).select("user");
        const unsubscribedIds = unsubscribed.map((u) => u.user);
        query._id.$nin = unsubscribedIds;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [total, users] = await Promise.all([
        User.countDocuments(query),
        User.find(query)
          .select("first_name last_name email phone avatar")
          .skip(skip)
          .limit(parseInt(limit)),
      ]);

      return res.status(200).json({
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        members: users,
      });
    }

    // Dynamic list - apply segmentation
    const query = buildSegmentationQuery(list.segmentation);

    // Exclude unsubscribed
    if (list.settings.excludeUnsubscribed && includeUnsubscribed === "false") {
      const unsubscribed = await EmailUnsubscribe.find({
        $or: [
          { unsubscribeType: "all" },
          { unsubscribeType: "marketing" },
        ],
      }).select("user");
      const unsubscribedIds = unsubscribed.map((u) => u.user);
      if (unsubscribedIds.length > 0) {
        query._id = { ...query._id, $nin: unsubscribedIds };
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select("first_name last_name email phone avatar")
        .skip(skip)
        .limit(parseInt(limit)),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      members: users,
    });
  } catch (error) {
    console.error("Error getting list members:", error);
    res.status(500).json({
      message: "Error getting list members",
      error: error.message,
    });
  }
};

/**
 * Add member to static list
 * POST /api/marketing-list/:id/members
 */
export const addListMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, tags } = req.body;
    const addedBy = req.userId;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const list = await MarketingList.findById(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    if (list.category !== "custom") {
      return res.status(400).json({
        message: "Can only add members to custom (static) lists",
      });
    }

    // Check if user already in list
    const existingMember = list.members.find(
      (m) => m.user.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({ message: "User already in list" });
    }

    list.members.push({
      user: userId,
      addedBy,
      tags: tags || [],
    });

    list.metadata.totalMembers = list.members.length;
    await list.save();

    res.status(200).json({
      message: "Member added successfully",
      list,
    });
  } catch (error) {
    console.error("Error adding list member:", error);
    res.status(500).json({
      message: "Error adding list member",
      error: error.message,
    });
  }
};

/**
 * Remove member from static list
 * DELETE /api/marketing-list/:id/members/:userId
 */
export const removeListMember = async (req, res) => {
  try {
    const { id, userId } = req.params;

    const list = await MarketingList.findById(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    list.members = list.members.filter(
      (m) => m.user.toString() !== userId
    );

    list.metadata.totalMembers = list.members.length;
    await list.save();

    res.status(200).json({
      message: "Member removed successfully",
      list,
    });
  } catch (error) {
    console.error("Error removing list member:", error);
    res.status(500).json({
      message: "Error removing list member",
      error: error.message,
    });
  }
};

/**
 * Update list member count (for dynamic lists)
 * POST /api/marketing-list/:id/update-count
 */
export const updateListCount = async (req, res) => {
  try {
    const { id } = req.params;

    const list = await MarketingList.findById(id);
    if (!list) {
      return res.status(404).json({ message: "Marketing list not found" });
    }

    // Build query for dynamic lists
    const query = buildSegmentationQuery(list.segmentation);

    // Exclude unsubscribed
    if (list.settings.excludeUnsubscribed) {
      const unsubscribed = await EmailUnsubscribe.find({
        $or: [
          { unsubscribeType: "all" },
          { unsubscribeType: "marketing" },
        ],
      }).select("user");
      const unsubscribedIds = unsubscribed.map((u) => u.user);
      if (unsubscribedIds.length > 0) {
        query._id = { ...query._id, $nin: unsubscribedIds };
      }
    }

    const count = await User.countDocuments(query);

    list.metadata.lastMemberCount = list.metadata.totalMembers;
    list.metadata.totalMembers = count;
    list.metadata.lastCountUpdate = new Date();
    list.settings.lastUpdated = new Date();

    await list.save();

    res.status(200).json({
      message: "List count updated successfully",
      count,
      list,
    });
  } catch (error) {
    console.error("Error updating list count:", error);
    res.status(500).json({
      message: "Error updating list count",
      error: error.message,
    });
  }
};

/**
 * Build MongoDB query from segmentation criteria
 */
function buildSegmentationQuery(segmentation) {
  const query = {};

  // User status filters
  if (segmentation.userStatus) {
    const { verified, hasSubscription, hasActiveListing, hasAttendedEvent } =
      segmentation.userStatus;

    if (verified !== null && verified !== undefined) {
      // This would require joining with Questionnaire/Verification
      // For now, we'll handle this in the application layer
    }

    if (hasSubscription !== null && hasSubscription !== undefined) {
      // This requires aggregation or separate query
    }
  }

  // Date filters
  if (segmentation.dateFilters) {
    const { registeredAfter, registeredBefore, lastActiveAfter, lastActiveBefore } =
      segmentation.dateFilters;

    if (registeredAfter || registeredBefore) {
      query.createdAt = {};
      if (registeredAfter) query.createdAt.$gte = new Date(registeredAfter);
      if (registeredBefore) query.createdAt.$lte = new Date(registeredBefore);
    }
  }

  // Custom query
  if (segmentation.customQuery) {
    Object.assign(query, segmentation.customQuery);
  }

  return query;
}

/**
 * Unsubscribe from marketing emails
 * POST /api/marketing-list/unsubscribe
 */
export const unsubscribeFromMarketing = async (req, res) => {
  try {
    const { email, token, reason, unsubscribeType = "marketing" } = req.body;

    // If token provided, verify it
    if (token) {
      const unsubscribe = await EmailUnsubscribe.findOne({ token });
      if (!unsubscribe) {
        return res.status(404).json({ message: "Invalid unsubscribe token" });
      }
      // Token is valid, user is already unsubscribed
      return res.status(200).json({
        message: "You are already unsubscribed from marketing emails",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    // Create or update unsubscribe record
    await EmailUnsubscribe.findOneAndUpdate(
      { user: user._id, unsubscribeType },
      {
        user: user._id,
        email: user.email,
        unsubscribeType,
        reason,
        token: unsubscribeToken,
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      message: "Successfully unsubscribed from marketing emails",
    });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({
      message: "Error processing unsubscribe request",
      error: error.message,
    });
  }
};

