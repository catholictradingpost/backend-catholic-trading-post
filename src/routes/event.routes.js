import express from "express";
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  rsvpToEvent,
  cancelRSVP,
  getEventRSVPs,
} from "../controllers/event.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { checkEventAccess, checkEventAdminAccess } from "../middlewares/eventAccess.middleware.js";

const router = express.Router();

// Public routes (getEvents handles access control internally)
router.get("/", getEvents);
router.get("/:id", getEventById); // Access control handled in controller

// RSVP routes (authenticated)
router.post("/:id/rsvp", verifyToken, rsvpToEvent);
router.delete("/:id/rsvp", verifyToken, cancelRSVP);

// Admin/Host routes
router.post("/", verifyToken, checkEventAdminAccess, createEvent);
router.put("/:id", verifyToken, updateEvent);
router.delete("/:id", verifyToken, deleteEvent);
router.get("/:id/rsvps", verifyToken, getEventRSVPs);

export default router;

