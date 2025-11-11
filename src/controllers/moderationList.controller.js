import ModerationList from "../models/moderationList.model.js";
import User from "../models/user.model.js";

/**
 * Get all moderation list entries
 * GET /api/moderation-list
 */
export const getModerationList = async (req, res) => {
  try {
    const { type, category, active, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (active !== undefined) filter.active = active === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, entries] = await Promise.all([
      ModerationList.countDocuments(filter),
      ModerationList.find(filter)
        .populate("createdBy", "first_name last_name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      entries,
    });
  } catch (error) {
    console.error("Error getting moderation list:", error);
    res.status(500).json({
      message: "Error getting moderation list",
      error: error.message,
    });
  }
};

/**
 * Add entry to moderation list
 * POST /api/moderation-list
 */
export const addModerationEntry = async (req, res) => {
  try {
    const {
      type,
      category,
      term,
      caseSensitive,
      matchType,
      reason,
      guidelineReference,
      severity,
      notes,
    } = req.body;
    const userId = req.userId;

    if (!type || !category || !term) {
      return res.status(400).json({
        message: "Type, category, and term are required",
      });
    }

    // Check if entry already exists
    const existing = await ModerationList.findOne({
      type,
      category,
      term: term.trim(),
    });

    if (existing) {
      return res.status(400).json({
        message: "This entry already exists in the moderation list",
        entry: existing,
      });
    }

    const entry = new ModerationList({
      type,
      category,
      term: term.trim(),
      caseSensitive: caseSensitive || false,
      matchType: matchType || "partial",
      reason: reason || "",
      guidelineReference: guidelineReference || "",
      severity: severity || "medium",
      notes: notes || "",
      createdBy: userId,
      active: true,
    });

    await entry.save();
    await entry.populate("createdBy", "first_name last_name");

    res.status(201).json({
      message: "Moderation list entry created successfully",
      entry,
    });
  } catch (error) {
    console.error("Error adding moderation entry:", error);
    res.status(500).json({
      message: "Error adding moderation entry",
      error: error.message,
    });
  }
};

/**
 * Update moderation list entry
 * PUT /api/moderation-list/:id
 */
export const updateModerationEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      term,
      caseSensitive,
      matchType,
      reason,
      guidelineReference,
      severity,
      active,
      notes,
    } = req.body;

    const entry = await ModerationList.findById(id);
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    if (term) entry.term = term.trim();
    if (caseSensitive !== undefined) entry.caseSensitive = caseSensitive;
    if (matchType) entry.matchType = matchType;
    if (reason !== undefined) entry.reason = reason;
    if (guidelineReference !== undefined)
      entry.guidelineReference = guidelineReference;
    if (severity) entry.severity = severity;
    if (active !== undefined) entry.active = active;
    if (notes !== undefined) entry.notes = notes;

    await entry.save();

    res.status(200).json({
      message: "Moderation list entry updated successfully",
      entry,
    });
  } catch (error) {
    console.error("Error updating moderation entry:", error);
    res.status(500).json({
      message: "Error updating moderation entry",
      error: error.message,
    });
  }
};

/**
 * Delete moderation list entry
 * DELETE /api/moderation-list/:id
 */
export const deleteModerationEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await ModerationList.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    res.status(200).json({
      message: "Moderation list entry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting moderation entry:", error);
    res.status(500).json({
      message: "Error deleting moderation entry",
      error: error.message,
    });
  }
};

/**
 * Bulk import moderation list entries
 * POST /api/moderation-list/bulk
 */
export const bulkImportModerationList = async (req, res) => {
  try {
    const { entries } = req.body;
    const userId = req.userId;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        message: "Entries array is required",
      });
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    for (const entryData of entries) {
      try {
        const { type, category, term } = entryData;

        if (!type || !category || !term) {
          results.errors.push({
            entry: entryData,
            error: "Missing required fields: type, category, or term",
          });
          continue;
        }

        // Check if exists
        const existing = await ModerationList.findOne({
          type,
          category,
          term: term.trim(),
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create entry
        const entry = new ModerationList({
          type,
          category,
          term: term.trim(),
          caseSensitive: entryData.caseSensitive || false,
          matchType: entryData.matchType || "partial",
          reason: entryData.reason || "",
          guidelineReference: entryData.guidelineReference || "",
          severity: entryData.severity || "medium",
          notes: entryData.notes || "",
          createdBy: userId,
          active: entryData.active !== undefined ? entryData.active : true,
        });

        await entry.save();
        results.created++;
      } catch (error) {
        results.errors.push({
          entry: entryData,
          error: error.message,
        });
      }
    }

    res.status(200).json({
      message: "Bulk import completed",
      results,
    });
  } catch (error) {
    console.error("Error bulk importing moderation list:", error);
    res.status(500).json({
      message: "Error bulk importing moderation list",
      error: error.message,
    });
  }
};

