import Log from "../models/log.model.js";
import User from "../models/user.model.js";

/**
 * Get audit logs with filters (admin only)
 * GET /api/log/audit
 */
export const getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      resourceType,
      resourceId,
      userId,
      outcome,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filter = {};

    if (action) filter.action = action;
    if (resourceType) filter.resourceType = resourceType;
    if (resourceId) filter.resourceId = resourceId;
    if (userId) filter.user = userId;
    if (outcome) filter.outcome = outcome;

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        filter.date.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, logs] = await Promise.all([
      Log.countDocuments(filter),
      Log.find(filter)
        .populate("user", "first_name last_name email")
        .sort({ date: -1 }) // Most recent first
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      logs,
    });
  } catch (error) {
    console.error("Error getting audit logs:", error);
    res.status(500).json({
      message: "Error getting audit logs",
      error: error.message,
    });
  }
};

/**
 * Get audit log statistics
 * GET /api/log/audit/stats
 */
export const getAuditLogStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    // Actions by type
    const actionsByType = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$action", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Resources by type
    const resourcesByType = await Log.aggregate([
      { $match: { ...dateFilter, resourceType: { $ne: null } } },
      { $group: { _id: "$resourceType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Outcomes
    const outcomes = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$outcome", count: { $sum: 1 } } },
    ]);

    // Top admins by action count
    const topAdmins = await Log.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$user", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          firstName: "$user.first_name",
          lastName: "$user.last_name",
          email: "$user.email",
          actionCount: "$count",
        },
      },
    ]);

    res.status(200).json({
      actionsByType,
      resourcesByType,
      outcomes,
      topAdmins,
    });
  } catch (error) {
    console.error("Error getting audit log stats:", error);
    res.status(500).json({
      message: "Error getting audit log statistics",
      error: error.message,
    });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { action, resource, user, startDate, endDate, page = 1, limit = 10 } = req.query;

    const filters = {};

    if (action) filters.action = action;
    if (resource) filters.resource = resource;
    if (user) filters.user = user;
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.$gte = new Date(startDate);
      if (endDate) filters.date.$lte = new Date(endDate);
    }

    const logs = await Log.find(filters)
      .populate('user', 'name email')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Log.countDocuments(filters);

    res.status(200).json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      logs
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching logs", error: error.message });
  }
};
