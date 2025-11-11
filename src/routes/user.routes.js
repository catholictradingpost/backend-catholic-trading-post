// routes/user.routes.js

import express from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";

const router = express.Router();

// Route to get all users
router.get("/all", getUsers); // Get all users

// Route to get a user by ID
router.get("/getById/:id", getUserById); // Get a user by ID

// Route to update a user by ID
router.put("/update/:id", verifyToken, updateUser); // Update a user by ID

// Route to delete a user by ID
router.delete("/delete/:id", verifyToken, deleteUser); // Delete a user by ID

export default router;

