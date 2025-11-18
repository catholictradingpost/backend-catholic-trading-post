// libs/socket.js
import { Server as SocketIOServer } from "socket.io";
import { getAllowedOrigins } from "../config.js";

let io;
const onlineUsers = new Map();

export const initSocket = (server) => {
  const allowedOrigins = getAllowedOrigins();
  
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Support both WebSocket and polling
    allowEIO3: true, // Allow Engine.IO v3 clients
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8, // 100MB
    allowUpgrades: true,
    perMessageDeflate: true,
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // Regular chat events
    socket.on("join_chat", (chatId) => {
      socket.join(`chat_${chatId}`);
      console.log(`Socket ${socket.id} joined chat ${chatId}`);
    });

    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`Socket ${socket.id} left chat ${chatId}`);
    });

    socket.on("typing", ({ chatId, userId, userName, isTyping }) => {
      console.log(`📝 Typing event received from user ${userId} in chat ${chatId}, isTyping: ${isTyping}`);
      console.log(`📤 Broadcasting to room: chat_${chatId}`);
      
      // Broadcast to all users in the chat room except the sender
      socket.to(`chat_${chatId}`).emit("user_typing", {
        chatId,
        userId,
        userName,
        isTyping,
      });
      
      // Log room members for debugging
      const room = io.sockets.adapter.rooms.get(`chat_${chatId}`);
      if (room) {
        console.log(`👥 Room chat_${chatId} has ${room.size} members`);
      } else {
        console.warn(`⚠️ Room chat_${chatId} does not exist`);
      }
    });

    // Marketplace messaging events
    socket.on("join_marketplace_thread", (threadId) => {
      socket.join(`marketplace_thread_${threadId}`);
      console.log(`Socket ${socket.id} joined marketplace thread ${threadId}`);
    });

    socket.on("leave_marketplace_thread", (threadId) => {
      socket.leave(`marketplace_thread_${threadId}`);
      console.log(`Socket ${socket.id} left marketplace thread ${threadId}`);
    });

    socket.on("typing_marketplace", ({ threadId, userId, isTyping }) => {
      socket.to(`marketplace_thread_${threadId}`).emit("user_typing_marketplace", {
        threadId,
        userId,
        isTyping,
      });
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

export const getIO = () => io;
export { onlineUsers };
