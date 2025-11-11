// libs/socket.js
import { Server as SocketIOServer } from "socket.io";
import { getAllowedOrigins } from "../config.js";

let io;
const onlineUsers = new Map();

export const initSocket = (server) => {
  const allowedOrigins = getAllowedOrigins();
  
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : "*", 
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // Support both WebSocket and polling
    allowEIO3: true, // Allow Engine.IO v3 clients
  });

  io.on("connection", (socket) => {
    console.log("🔌 New socket connected:", socket.id);

    socket.on("register", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} registered with socket ${socket.id}`);
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
