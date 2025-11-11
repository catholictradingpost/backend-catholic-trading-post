import mongoose from "mongoose";

/**
 * Content Report Model
 * Tracks reports of inappropriate listings, posts, users, etc.
 */
const contentReportSchema = new mongoose.Schema(
  {
    // Reporter (user who reported)
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Type of content being reported
    contentType: {
      type: String,
      enum: ["listing", "post", "user", "message", "comment", "event"],
      required: true,
      index: true,
    },
    // Reference to the reported content
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    // Content model name (for dynamic reference)
    contentModel: {
      type: String,
      enum: ["Marketplace", "Post", "User", "Message", "Comment", "Event"],
      required: true,
    },
    // Report reason
    reason: {
      type: String,
      enum: [
        "spam",
        "inappropriate_content",
        "harassment",
        "scam",
        "fake_listing",
        "prohibited_item",
        "offensive_language",
        "misleading_information",
        "other",
      ],
      required: true,
    },
    // Detailed description
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    // Report status
    status: {
      type: String,
      enum: ["pending", "reviewing", "resolved", "dismissed", "escalated"],
      default: "pending",
      index: true,
    },
    // Priority level
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    // Assigned moderator
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Review information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    // Resolution details
    resolution: {
      type: String,
      enum: ["no_action", "content_removed", "user_warned", "user_suspended", "user_banned"],
      default: null,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for moderation queue
contentReportSchema.index({ status: 1, priority: 1, createdAt: 1 });
contentReportSchema.index({ contentType: 1, contentId: 1 });
contentReportSchema.index({ reporter: 1, contentId: 1 }, { unique: true }); // One report per user per content

export default mongoose.model("ContentReport", contentReportSchema);

