import mongoose from "mongoose";

/**
 * Marketplace Thread Model
 * Represents a conversation thread between buyer and seller for a specific listing
 */
const marketplaceThreadSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Marketplace",
      required: true,
      index: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Block status - if either party blocks, thread is blocked
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    // Read indicators - track last read message for each participant
    readBy: {
      buyer: {
        lastReadMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
          default: null,
        },
        lastReadAt: {
          type: Date,
          default: null,
        },
      },
      seller: {
        lastReadMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
          default: null,
        },
        lastReadAt: {
          type: Date,
          default: null,
        },
      },
    },
    // Unread message counts
    unreadCount: {
      buyer: {
        type: Number,
        default: 0,
      },
      seller: {
        type: Number,
        default: 0,
      },
    },
    // Last message for quick access
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
marketplaceThreadSchema.index({ listing: 1, buyer: 1, seller: 1 });
marketplaceThreadSchema.index({ buyer: 1 });
marketplaceThreadSchema.index({ seller: 1 });
marketplaceThreadSchema.index({ lastMessageAt: -1 });

// Ensure one thread per listing-buyer-seller combination
marketplaceThreadSchema.index({ listing: 1, buyer: 1, seller: 1 }, { unique: true });

export default mongoose.model("MarketplaceThread", marketplaceThreadSchema);

