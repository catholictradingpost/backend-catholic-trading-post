import express from "express";
import { getUserMedia, getChatMedia } from "../controllers/library.controller.js";

const router = express.Router();

// Get all media sent by a specific user
router.get("/user/:userId", getUserMedia);

// Get all media from a specific chat (optional query param: ?type=image)
router.get("/chat/:chatId", getChatMedia);

export default router;
