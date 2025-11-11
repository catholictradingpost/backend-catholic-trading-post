import { Router } from "express";
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = Router();

//Get notifications by user id
router.get("/all/:userId", getNotifications);    

//Mark a notification as read.    
router.put("/read/:id", markAsRead);    

// Route to delete an notification by ID
router.delete("/delete/:id", deleteNotification); 

export default router;
