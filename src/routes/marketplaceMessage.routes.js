import express from "express";
import {
  getOrCreateThread,
  getUserThreads,
  getThreadMessages,
  sendThreadMessage,
  markThreadAsRead,
  blockThread,
  reportMessage,
} from "../controllers/marketplaceMessage.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Get or create thread for a listing
router.post(
  "/thread",
  verifyToken,
  getOrCreateThread
);

// Get all threads for user
router.get("/threads", verifyToken, getUserThreads);

// Get messages for a thread
router.get("/thread/:threadId/messages", verifyToken, getThreadMessages);

// Send message in thread
router.post(
  "/thread/:threadId/message",
  verifyToken,
  sendThreadMessage
);

// Mark thread as read
router.put("/thread/:threadId/read", verifyToken, markThreadAsRead);

// Block thread/user
router.post("/thread/:threadId/block", verifyToken, blockThread);

// Report a message
router.post("/message/:messageId/report", verifyToken, reportMessage);

export default router;

