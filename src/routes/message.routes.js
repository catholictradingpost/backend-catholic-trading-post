import express from "express";
import multer from "multer";
import {
  addMessage,
  getMessages,
  updateMessage,
  deleteMessage,
} from "../controllers/message.controller.js"; 
import { moderateText } from "../middlewares/moderation.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // Use memoryStorage for in-memory file handling

// Route to create a new message (supports text and file)
router.post("/create", upload.single("file"), moderateText, addMessage);

// Route to fetch messages by chatId, with optional pagination
router.get("/get/:chatId", getMessages);

// Route to update a message by its ID (marks as edited)
router.put("/update/:id", upload.single("file"), moderateText, updateMessage);

// Route to delete a message by its ID
router.delete("/delete/:id", deleteMessage);

export default router;
