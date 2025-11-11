import mongoose from "mongoose";

/**
 * User Block Model
 * Tracks blocked users to prevent messaging and interactions
 */
const userBlockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one block record per blocker-blocked pair
userBlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export default mongoose.model("UserBlock", userBlockSchema);

