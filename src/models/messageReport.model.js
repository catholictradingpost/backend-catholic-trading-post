import mongoose from "mongoose";

/**
 * Message Report Model
 * Tracks reports of inappropriate messages
 */
const messageReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MarketplaceThread",
      required: true,
    },
    reason: {
      type: String,
      enum: [
        'spam',
        'harassment',
        'inappropriate_content',
        'scam',
        'fake_listing',
        'other'
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageReportSchema.index({ reporter: 1, message: 1 }, { unique: true });
messageReportSchema.index({ status: 1 });

export default mongoose.model("MessageReport", messageReportSchema);

