import express from "express";
import {
  getAllPermissions,
  updatePermission
} from "../controllers/permission.controller.js";
import { checkPermission } from "../middlewares/checkPermission.middleware.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { logAction } from "../middlewares/log.middleware.js";

const router = express.Router();

// Get all permissions
router.get("/all", verifyToken, checkPermission("permission", "read"), logAction("read", "permission"), getAllPermissions);

// Update a specific permission
router.put("/update/:id", verifyToken, checkPermission("permission", "update"), logAction("update", "permission"), updatePermission);

export default router;
