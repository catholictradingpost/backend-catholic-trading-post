// routes/chat.routes.js
import express from "express";
import {
  getChatByUser,     
  getChatById,     
  createChat,        
  deleteChat,      
} from "../controllers/chat.controller.js";
import { verifyToken } from '../middlewares/authJwt.middleware.js';

import { getFriendsWithoutChat } from "../controllers/chat.controller.js";

const router = express.Router();

// Route to get all Chat by user ID
router.get("/getByUser/:userId", verifyToken, getChatByUser);

// Route to get conversation details by ID (includes messages)
router.get("/getById/:id", verifyToken, getChatById);

// Route to create new conversation (requires participants, isGroup, name)
router.post("/create", verifyToken, createChat);

// Route to delete a full conversation by conversation ID (includes messages)
router.delete("/delete/:id", verifyToken, deleteChat);

router.get("/friends/:userId", verifyToken, getFriendsWithoutChat);

export default router;
