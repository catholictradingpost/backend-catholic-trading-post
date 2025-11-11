import Message from "../models/message.model.js";
import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import Notification from "../models/notification.model.js";
import fs from "fs";
import path from "path";
import { getIO, onlineUsers } from "../libs/socket.js";

// Get messages with pagination
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  try {
    // Fetch messages for the given chat, paginated and sorted by creation date (newest first)
    const messages = await Message.find({ chatId })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .populate("sender", "first_name last_name avatar") // Optional: populate sender info
      .lean(); // Use lean for performance if you're not modifying the docs

    // Reverse the list so the client receives them in chronological order
    const orderedMessages = messages.reverse();

    res.status(200).json({
      currentPage: parseInt(page),
      totalMessages: messages.length,
      messages: orderedMessages,
    });
  } catch (error) {
    res.status(500).json({ error: "Error fetching messages" });
  }
};

// Send a new message
export const addMessage = async (req, res) => {
  try {
    const { chatId, sender, text, type } = req.body;

    // Validación: al menos texto o archivo
    if (!chatId || !sender || (!text && !req.file)) {
      return res.status(400).json({ error: "Text or file is required." });
    }

    const chat = await Chat.findById(chatId).populate("participants");
    if (!chat) return res.status(404).json({ error: "Chat not found." });

    const senderIsParticipant = chat.participants.some(
      (p) => p._id.toString() === sender
    );
    if (!senderIsParticipant)
      return res.status(403).json({ error: "Sender is not a participant." });

    let fileUrl = null;
    let finalType = type || "text";

    if (req.file) {
      const allowedMimeTypes = {
        image: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
        document: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        audio: ["audio/mpeg", "audio/mp3", "audio/wav"],
        video: ["video/mp4", "video/quicktime", "video/webm"],
      };

      const isValidType = allowedMimeTypes[finalType]?.includes(req.file.mimetype);

      if (!isValidType) {
        return res.status(400).json({ error: "File type does not match declared type." });
      }

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

      const timestamp = Date.now();
      const extension = path.extname(req.file.originalname);
      const filename = `${timestamp}_${req.file.originalname}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);
      fileUrl = `uploads/${filename}`;
    }

    const message = new Message({
      chatId,
      sender,
      content: text || null,
      fileUrl,
      type: fileUrl ? finalType : "text",
    });

    await message.save();

    const recipientIds = chat.participants
      .filter((p) => p._id.toString() !== sender)
      .map((p) => p._id.toString());

    const senderUser = await User.findById(sender);
    const io = getIO();

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const recipientSocketId = onlineUsers.get(recipientId);

        if (recipientSocketId) {
          io.to(recipientSocketId).emit("new_message", {
            chatId,
            message,
            from: senderUser.first_name,
          });
        }

        await Notification.create({
          user: recipientId,
          title: chat.chatName || `${senderUser.first_name} sent you a message`,
          description: text
            ? text
            : fileUrl
            ? `[${finalType} sent]`
            : "New message",
        });
      })
    );

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ error: "Internal server error while sending message." });
  }
};

// Update a message

export const updateMessage = async (req, res) => {
  try {
    const { text, type } = req.body;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    let hasChanges = false;        

    // Compare content
    const existingContent = message.content?.trim() || "";
    const newContent = text?.trim() || "";

    if (newContent && newContent !== existingContent) {
      message.content = newContent;
      hasChanges = true;
    }

    // Handle file replacement
    if (req.file) {
      const allowedMimeTypes = {
        image: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
        document: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        audio: ["audio/mpeg", "audio/mp3", "audio/wav"],
        video: ["video/mp4", "video/quicktime", "video/webm"],
      };

      const finalType = type || message.type;
      const isValidType = allowedMimeTypes[finalType]?.includes(req.file.mimetype);

      if (!isValidType) {
        return res.status(400).json({ error: "File type does not match declared type." });
      }

      // Delete old file if it exists
      if (message.fileUrl) {
        const oldFilePath = path.join(process.cwd(), message.fileUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Save new file
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

      const timestamp = Date.now();
      const extension = path.extname(req.file.originalname);
      const filename = `${timestamp}_${req.file.originalname}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, req.file.buffer);

      message.fileUrl = `uploads/${filename}`;
      message.type = finalType;
      hasChanges = true;
    }

    if (!hasChanges) {
      return res.status(400).json({ message: "No changes detected in the message." });
    }

    message.edited = true;
    await message.save();

    res.status(200).json({ message: "Message updated", data: message });
  } catch (error) {
    res.status(500).json({ message: "Error updating message", error: error.message });
  }
};

// Delete a message

export const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;

    // Find the message by ID
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // If the message has an associated file, remove it from the disk
    if (message.fileUrl) {
      const filePath = path.join(process.cwd(), message.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // Delete the file
      }
    }

    // Finally delete the message from the database
    await message.deleteOne();

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message", error: error.message });
  }
};