import express from "express";
import {
  getPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan
} from "../controllers/plan.controller.js";
import { 
    verifyToken 
} from "../middlewares/authJwt.middleware.js";
import { checkPermission } from "../middlewares/checkPermission.middleware.js";
import { logAction } from "../middlewares/log.middleware.js";
const router = express.Router();

// Route to get all plans (accessible by any authenticated user)
router.get("/all", verifyToken, logAction("read", "plan"), getPlans);

// Route to get a plan by ID (accessible by any authenticated user)
router.get("/getById/:id", verifyToken, logAction("read", "plan"), getPlanById);

// Route to create a new plan (only accessible by Super User or Admin)
router.post("/create", verifyToken, checkPermission("plan", "create"), logAction("create", "plan"), createPlan);

// Route to update an existing plan by ID (only accessible by Super User or Admin)
router.put("/update/:id", verifyToken, checkPermission("plan", "update"), logAction("update", "plan"), updatePlan);

// Route to delete a plan by ID (only accessible by Super User or Admin)
router.delete("/delete/:id", verifyToken, checkPermission("plan", "delete"), logAction("delete", "plan"), deletePlan);

export default router;
