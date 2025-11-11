import express from "express";
import { getConfig, updateConfig } from "../controllers/config.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Get configuration
router.get("/", verifyToken, getConfig);

// Update configuration
router.put("/", verifyToken, updateConfig);

export default router;

