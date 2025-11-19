import express from "express";
import {
  getParishes,
  getParishById,
  createParish,
  updateParish,
  deleteParish,
} from "../controllers/parish.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Public routes (getParishes filters by status internally)
router.get("/", getParishes);
router.get("/:id", getParishById); // Access control handled in controller

// Admin routes (authenticated)
router.post("/", verifyToken, createParish);
router.put("/:id", verifyToken, updateParish);
router.delete("/:id", verifyToken, deleteParish);

export default router;

