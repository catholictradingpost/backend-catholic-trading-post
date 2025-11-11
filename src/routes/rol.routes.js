// routes/rol.routes.js
import express from "express";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/rol.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { checkPermission } from "../middlewares/checkPermission.middleware.js";

const router = express.Router();

// Route to create a new rol
router.post("/create", verifyToken, checkPermission("role", "create"), createRole);

// Route to get all roles (permission check removed for admin panel access)
router.get("/all", verifyToken, getRoles);

// Route to get a rol by ID
router.get("/getById/:id", verifyToken, checkPermission("role", "read"), getRoleById);

// Route to update a rol by ID
router.put("/update/:id", verifyToken, checkPermission("role", "update"), updateRole);

// Route to delete a rol by ID
router.delete("/delete/:id", verifyToken, checkPermission("role", "delete"), deleteRole);

export default router;
