import MarketplaceThread from "../models/marketplaceThread.model.js";
import Marketplace from "../models/marketplace.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import UserBlock from "../models/userBlock.model.js";
import MessageReport from "../models/messageReport.model.js";
import { getIO, onlineUsers } from "../libs/socket.js";
import { sendMessageNotificationEmail } from "../libs/emailService.js";

/**
 * Get or create a marketplace thread for a listing
 * POST /api/marketplace-message/thread
 */
export const getOrCreateThread = async (req, res) => {
  try {
    const { listingId } = req.body;
    const buyerId = req.userId;

    if (!listingId) {
      return res.status(400).json({ message: "Listing ID is required" });
    }

    // Get listing and verify it exists
    const listing = await Marketplace.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    const sellerId = listing.owner;

    // Can't message yourself
    if (buyerId.toString() === sellerId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    // Check if buyer is blocked by seller
    const isBlocked = await UserBlock.findOne({
      blocker: sellerId,
      blocked: buyerId,
    });
    if (isBlocked) {
      return res.status(403).json({ message: "You are blocked from messaging this seller" });
    }

    // Check if seller is blocked by buyer
    const buyerBlocked = await UserBlock.findOne({
      blocker: buyerId,
      blocked: sellerId,
    });
    if (buyerBlocked) {
      return res.status(403).json({ message: "You have blocked this seller" });
    }

    // Find existing thread or create new one
    let thread = await MarketplaceThread.findOne({
      listing: listingId,
      buyer: buyerId,
      seller: sellerId,
    })
      .populate("buyer", "first_name last_name email avatar")
      .populate("seller", "first_name last_name email avatar")
      .populate("listing", "title price photos");

    if (!thread) {
      // Create new thread
      thread = new MarketplaceThread({
        listing: listingId,
        buyer: buyerId,
        seller: sellerId,
      });
      await thread.save();

      // Populate after save
      await thread.populate("buyer", "first_name last_name email avatar");
      await thread.populate("seller", "first_name last_name email avatar");
      await thread.populate("listing", "title price photos");
    }

    // Check if thread is blocked
    if (thread.blockedBy) {
      return res.status(403).json({ message: "This conversation has been blocked" });
    }

    res.status(200).json({ thread });
  } catch (error) {
    console.error("Error getting/creating thread:", error);
    res.status(500).json({ message: "Error getting thread", error: error.message });
  }
};

/**
 * Get all threads for a user (as buyer or seller)
 * GET /api/marketplace-message/threads
 */
export const getUserThreads = async (req, res) => {
  try {
    const userId = req.userId;
    const { role = "all" } = req.query; // "buyer", "seller", or "all"

    let query = {};
    if (role === "buyer") {
      query = { buyer: userId };
    } else if (role === "seller") {
      query = { seller: userId };
    } else {
      query = { $or: [{ buyer: userId }, { seller: userId }] };
    }

    const threads = await MarketplaceThread.find(query)
      .populate("buyer", "first_name last_name avatar")
      .populate("seller", "first_name last_name avatar")
      .populate("listing", "title price photos status")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Filter out blocked threads unless user is the blocker
    const filteredThreads = threads.filter((thread) => {
      if (!thread.blockedBy) return true;
      return thread.blockedBy.toString() === userId;
    });

    res.status(200).json({ threads: filteredThreads });
  } catch (error) {
    console.error("Error getting user threads:", error);
    res.status(500).json({ message: "Error getting threads", error: error.message });
  }
};

/**
 * Get messages for a marketplace thread
 * GET /api/marketplace-message/thread/:threadId/messages
 */
export const getThreadMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    const thread = await MarketplaceThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is participant
    if (
      thread.buyer.toString() !== userId &&
      thread.seller.toString() !== userId
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if blocked
    if (thread.blockedBy && thread.blockedBy.toString() !== userId) {
      return res.status(403).json({ message: "This conversation has been blocked" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({
      marketplaceThread: threadId,
    })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate("sender", "first_name last_name avatar")
      .lean();

    // Mark messages as read
    const isBuyer = thread.buyer.toString() === userId;
    const readField = isBuyer ? "buyer" : "seller";

    // Update read indicators
    if (messages.length > 0) {
      const lastMessage = messages[0];
      thread.readBy[readField].lastReadMessage = lastMessage._id;
      thread.readBy[readField].lastReadAt = new Date();

      // Update unread count
      const unreadMessages = await Message.countDocuments({
        marketplaceThread: threadId,
        sender: { $ne: userId },
        readBy: { $ne: { $elemMatch: { user: userId } } },
        createdAt: { $gt: thread.readBy[readField].lastReadAt || new Date(0) },
      });

      thread.unreadCount[readField] = unreadMessages;
      await thread.save();
    }

    res.status(200).json({
      messages: messages.reverse(), // Reverse to chronological order
      thread,
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error getting thread messages:", error);
    res.status(500).json({ message: "Error getting messages", error: error.message });
  }
};

/**
 * Send a message in a marketplace thread
 * POST /api/marketplace-message/thread/:threadId/message
 */
export const sendThreadMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content } = req.body;
    const senderId = req.userId;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const thread = await MarketplaceThread.findById(threadId)
      .populate("buyer", "first_name last_name email")
      .populate("seller", "first_name last_name email")
      .populate("listing", "title");

    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is participant
    const isBuyer = thread.buyer._id.toString() === senderId;
    const isSeller = thread.seller._id.toString() === senderId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Check if blocked
    if (thread.blockedBy && thread.blockedBy.toString() !== senderId) {
      return res.status(403).json({ message: "This conversation has been blocked" });
    }

    // Check if user is blocked
    const recipientId = isBuyer ? thread.seller._id : thread.buyer._id;
    const isBlocked = await UserBlock.findOne({
      blocker: recipientId,
      blocked: senderId,
    });
    if (isBlocked) {
      return res.status(403).json({ message: "You are blocked from messaging this user" });
    }

    // Create message and populate sender in parallel with thread update
    const message = new Message({
      chatId: null, // Not using chat model for marketplace
      sender: senderId,
      content: content.trim(),
      type: "text",
      marketplaceThread: threadId,
      status: "sent",
    });

    // Populate sender before saving for faster response
    await message.populate("sender", "first_name last_name avatar");
    await message.save();

    // Update thread and emit socket in parallel (don't wait for thread save)
    const recipientField = isBuyer ? "seller" : "buyer";
    thread.lastMessage = message._id;
    thread.lastMessageAt = new Date();
    thread.unreadCount[recipientField] = (thread.unreadCount[recipientField] || 0) + 1;

    // Save thread asynchronously (don't block response)
    thread.save().catch(err => console.error("Error saving thread:", err));

    // Real-time notification via Socket.IO (immediate, don't wait)
    const io = getIO();
    const recipientSocketId = onlineUsers.get(recipientId.toString());
    
    // Convert message to plain object for socket emission
    const messageObj = message.toObject ? message.toObject() : message;
    
    // Emit to specific user socket and thread room (immediate, non-blocking)
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("marketplace_new_message", {
        threadId,
        message: messageObj,
        listingTitle: thread.listing?.title,
      });
    }
    
    // Also emit to thread room for real-time updates
    io.to(`marketplace_thread_${threadId}`).emit("marketplace_new_message", {
      threadId,
      message: messageObj,
      listingTitle: thread.listing?.title,
    });

    // Return response immediately (don't wait for email)
    res.status(200).json({ message: messageObj });

    // Email notification (only if recipient is not online) - async, don't block response
    if (!recipientSocketId) {
      const recipient = isBuyer ? thread.seller : thread.buyer;
      const sender = isBuyer ? thread.buyer : thread.seller;

      // Send email asynchronously (don't wait)
      sendMessageNotificationEmail(
        recipient.email,
        recipient.first_name,
        sender.first_name,
        thread.listing?.title || "Marketplace Listing",
        content.substring(0, 100), // Preview first 100 chars
        threadId,
        thread.listing?._id
      ).catch(err => console.error("Error sending email notification:", err));
    }
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
};

/**
 * Mark messages as read
 * PUT /api/marketplace-message/thread/:threadId/read
 */
export const markThreadAsRead = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.userId;

    const thread = await MarketplaceThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is participant
    const isBuyer = thread.buyer.toString() === userId;
    const isSeller = thread.seller.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get last message
    const lastMessage = await Message.findOne({
      marketplaceThread: threadId,
    })
      .sort({ createdAt: -1 })
      .limit(1);

    if (lastMessage) {
      const readField = isBuyer ? "buyer" : "seller";

      // Update read indicators
      thread.readBy[readField].lastReadMessage = lastMessage._id;
      thread.readBy[readField].lastReadAt = new Date();
      thread.unreadCount[readField] = 0;

      // Mark all messages as read
      await Message.updateMany(
        {
          marketplaceThread: threadId,
          sender: { $ne: userId },
          "readBy.user": { $ne: userId },
        },
        {
          $push: {
            readBy: {
              user: userId,
              readAt: new Date(),
            },
          },
          $set: { status: "seen" },
        }
      );

      await thread.save();
    }

    res.status(200).json({ message: "Thread marked as read", thread });
  } catch (error) {
    console.error("Error marking thread as read:", error);
    res.status(500).json({ message: "Error marking as read", error: error.message });
  }
};

/**
 * Block a user in a thread
 * POST /api/marketplace-message/thread/:threadId/block
 */
export const blockThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.userId;

    const thread = await MarketplaceThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    // Verify user is participant
    const isBuyer = thread.buyer.toString() === userId;
    const isSeller = thread.seller.toString() === userId;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Block the thread
    thread.blockedBy = userId;
    thread.blockedAt = new Date();

    // Also create a UserBlock record
    const blockedUserId = isBuyer ? thread.seller : thread.buyer;
    await UserBlock.findOneAndUpdate(
      {
        blocker: userId,
        blocked: blockedUserId,
      },
      {
        blocker: userId,
        blocked: blockedUserId,
        reason: "Blocked from marketplace conversation",
      },
      { upsert: true, new: true }
    );

    await thread.save();

    res.status(200).json({ message: "Thread blocked", thread });
  } catch (error) {
    console.error("Error blocking thread:", error);
    res.status(500).json({ message: "Error blocking thread", error: error.message });
  }
};

/**
 * Report a message
 * POST /api/marketplace-message/message/:messageId/report
 */
export const reportMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason, description } = req.body;
    const reporterId = req.userId;

    if (!reason) {
      return res.status(400).json({ message: "Report reason is required" });
    }

    const message = await Message.findById(messageId).populate("marketplaceThread");
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (!message.marketplaceThread) {
      return res.status(400).json({ message: "This message is not part of a marketplace thread" });
    }

    // Check if already reported
    const existingReport = await MessageReport.findOne({
      reporter: reporterId,
      message: messageId,
    });

    if (existingReport) {
      return res.status(400).json({ message: "You have already reported this message" });
    }

    // Create report
    const report = new MessageReport({
      reporter: reporterId,
      message: messageId,
      thread: message.marketplaceThread._id,
      reason,
      description: description || "",
    });

    await report.save();

    res.status(201).json({ message: "Message reported successfully", report });
  } catch (error) {
    console.error("Error reporting message:", error);
    res.status(500).json({ message: "Error reporting message", error: error.message });
  }
};

