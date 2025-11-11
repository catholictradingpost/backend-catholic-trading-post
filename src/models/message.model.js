// models/message.model.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: function() {
        // Only required if marketplaceThread is not set
        return !this.marketplaceThread;
      },
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
    },
    fileUrl: {
      type: String, 
    },
    type: {
      type: String,
      enum: ["text", "audio", "image", "document", "video"],
      default: "text",
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'seen'],
      default: 'sent',
    },
    // Read indicators - track who has read this message
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Marketplace thread reference (if this is a marketplace message)
    marketplaceThread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketplaceThread',
      default: null,
    },
    edited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Message", MessageSchema);
