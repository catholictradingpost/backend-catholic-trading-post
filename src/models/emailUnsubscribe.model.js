import mongoose from "mongoose";

/**
 * Email Unsubscribe Model
 * Tracks users who have unsubscribed from marketing emails
 */
const emailUnsubscribeSchema = new mongoose.Schema(
  {
    // User who unsubscribed
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Email address (for tracking even if user is deleted)
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // Unsubscribe type
    unsubscribeType: {
      type: String,
      enum: ["all", "marketing", "transactional", "notifications", "events"],
      default: "marketing",
      index: true,
    },
    // Reason (optional)
    reason: {
      type: String,
      trim: true,
    },
    // Unsubscribe token (for one-click unsubscribe)
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one unsubscribe record per user per type
emailUnsubscribeSchema.index({ user: 1, unsubscribeType: 1 }, { unique: true });

export default mongoose.model("EmailUnsubscribe", emailUnsubscribeSchema);

