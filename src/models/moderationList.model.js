import mongoose from "mongoose";

/**
 * Moderation List Model
 * Manages word/category safelist and blocklist per Catholic guidelines
 */
const moderationListSchema = new mongoose.Schema(
  {
    // List type: 'blocklist' or 'safelist'
    type: {
      type: String,
      enum: ["blocklist", "safelist"],
      required: true,
      index: true,
    },
    // Category: 'word', 'phrase', 'category', 'topic'
    category: {
      type: String,
      enum: ["word", "phrase", "category", "topic"],
      required: true,
      default: "word",
    },
    // The actual word/phrase/category to block or allow
    term: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // Case sensitive matching
    caseSensitive: {
      type: Boolean,
      default: false,
    },
    // Exact match or partial match
    matchType: {
      type: String,
      enum: ["exact", "partial", "regex"],
      default: "partial",
    },
    // Reason/description for this entry
    reason: {
      type: String,
      trim: true,
    },
    // Catholic guideline reference (optional)
    guidelineReference: {
      type: String,
      trim: true,
    },
    // Severity level (for blocklist)
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    // Active status
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Created by admin
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Notes
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
moderationListSchema.index({ type: 1, active: 1 });
moderationListSchema.index({ category: 1, active: 1 });
moderationListSchema.index({ term: 1, caseSensitive: 1 });

// Ensure unique terms per type and category
moderationListSchema.index({ type: 1, category: 1, term: 1 }, { unique: true });

export default mongoose.model("ModerationList", moderationListSchema);

