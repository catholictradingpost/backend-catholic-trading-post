// routes/dashboard.routes.js
import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Route to get dashboard statistics
router.get("/stats", verifyToken, getDashboardStats);

export default router;

