import Chat from "../models/chat.model.js";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Token from "../models/token.model.js";
import Friendship from "../models/friendship.model.js";
import mongoose from "mongoose";

// Format phone number to +58 format
const formatPhoneNumber = (phoneNumber) => {
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  if (cleaned.startsWith('58')) return cleaned;
  if (cleaned.startsWith('0')) return '58' + cleaned.slice(1);
  return '58' + cleaned;
};

export const getFriendsWithoutChat = async (req, res) => {
  const { userId } = req.params;
  const { q } = req.query; // cadena de búsqueda

  try {
    // 1. Obtener amistades aceptadas
    const friendships = await Friendship.find({
      $or: [
        { requester: userId, status: "accepted" },
        { recipient: userId, status: "accepted" }
      ]
    });

    // 2. Extraer friendIds
    const friendIds = friendships.map(f =>
      f.requester.toString() === userId ? f.recipient : f.requester
    );
    if (!friendIds.length) return res.json([]);

    // 3. Encontrar chats existentes del usuario
    const existingChats = await Chat.find({
      participants: { $all: [userId] }
    }).lean();

    // 4. Filtrar amigos sin chat
    const usersWithoutChat = [];
    for (const fid of friendIds) {
      const hasChat = existingChats.some(c =>
        c.participants.includes(fid) && c.participants.includes(userId)
      );
      if (!hasChat) usersWithoutChat.push(fid.toString());
    }
    if (!usersWithoutChat.length) return res.json([]);

    // 5. Construir filtro de búsqueda: sólo amigos sin chat
    const filter = { _id: { $in: usersWithoutChat } };
    if (q) {
      const regex = new RegExp(q, "i");
      // Busca en first_name o last_name
      filter.$or = [
        { first_name: regex },
        { last_name: regex },
      ];
    }

    // 6. Traer datos de usuario
    const results = await User.find(filter)
      .select("first_name last_name email avatar")
      .lean();

    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error fetching friends", error: err.message });
  }
};

// Get all chats by a specific user
export const getChatByUser = async (req, res) => {
  const { userId } = req.params;
  console.log(`[getChatByUser] Request received for userId: ${userId}`);

  try {
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const chats = await Chat.find({ participants: userObjectId }).lean();

    if (!chats.length) {
      return res.status(200).json([]);
    }

    for (const chat of chats) {
      const users = await User.find({ _id: { $in: chat.participants } }).select("first_name").lean();

      chat.participants = chat.participants.map(pid => {
        const user = users.find(u => u._id.toString() === pid.toString());
        return {
          _id: pid,
          first_name: user?.first_name || "Unknown user",
        };
      });

      if (!chat.chatName && chat.participants.length === 2) {
        const other = chat.participants.find(p => p._id.toString() !== userId);
        chat.chatName = other?.first_name || "Unnamed chat";
      }

      const lastMessage = await Message.findOne({ chatId: chat._id })
        .sort({ createdAt: -1 })
        .populate("readBy.user", "_id")
        .lean();
      chat.lastMessage = lastMessage || null;
    }

    res.json(chats);
  } catch (err) {
    console.error("Error in findChat:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// Get chat details and messages
export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate("participants", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const messages = await Message.find({ chat: chat._id })
      .populate("sender", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json({ chat, messages });
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat", error: error.message });
  }
};

// Create a new chat
export const createChat = async (req, res) => {
  try {
    const { userId } = req.query;
    const { participants, chatName } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    if (!Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ message: "A chat must have at least two participants." });
    }

    const participantIds = participants.map(id => new mongoose.Types.ObjectId(id));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const isGroupChat = participantIds.length > 2;

    if (isGroupChat && !chatName) {
      return res.status(400).json({ message: "A name is required for group chats." });
    }

    // Check if all user IDs exist
    const users = await User.find({ _id: { $in: participantIds } });
    if (users.length !== participantIds.length) {
      return res.status(400).json({ message: "One or more participant IDs are invalid." });
    }

    // Check for existing 1-on-1 chat
    if (participantIds.length === 2) {
      const existingChat = await Chat.findOne({
        participants: { $all: participantIds, $size: 2 },
      });
      if (existingChat) {
        return res.status(400).json({ message: "A chat already exists between these two participants." });
      }
    }

    // Create the chat
    const chat = new Chat({
      chatName: isGroupChat ? chatName : null,
      participants: participantIds
    });
    await chat.save();

    const participantsDetails = users.map(u => ({
      _id: u._id,
      first_name: u.first_name,
    }));

    let chatResponseName = chatName;
    if (!chatName && participantsDetails.length === 2) {
      const other = participantsDetails.find(p => p._id.toString() !== userId);
      chatResponseName = other?.first_name || "Unnamed chat";
    }

    res.json({
      _id: chat._id,
      participants: participantsDetails,
      chatName: chatResponseName
    });
  } catch (err) {
    console.error('Error in createChat:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Delete entire chat
export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findByIdAndDelete(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    await Message.deleteMany({ chat: chat._id });

    res.status(200).json({ message: "Chat and messages deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting chat", error: error.message });
  }
};
