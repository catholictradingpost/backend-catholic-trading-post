import express from "express";
import {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
} from "../controllers/group.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Public routes (getGroups filters by status and isPublic internally)
router.get("/", getGroups);
router.get("/:id", getGroupById); // Access control handled in controller

// Authenticated routes
router.post("/", verifyToken, createGroup);
router.put("/:id", verifyToken, updateGroup);
router.delete("/:id", verifyToken, deleteGroup);

export default router;

