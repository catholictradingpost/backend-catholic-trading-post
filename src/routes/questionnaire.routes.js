import express from "express";
import {
  createQuestionnaire,
  updateQuestionnaire,
  getAllQuestionnaires,
  getQuestionnaireByUser,
  deleteQuestionnaire,
  updateQuestionnaireStatus,
  getQuestionnaireById,
} from "../controllers/questionnaire.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import User from "../models/user.model.js";

const router = express.Router();

// Crear (solo si no existe)
router.post(
  "/",
  verifyToken,
  createQuestionnaire
);

// Listar todos
router.get(
  "/all",
  verifyToken,
  getAllQuestionnaires
);

// Admin routes - MUST be before /:userId routes to avoid route conflicts
// Middleware to check if user is admin
const checkAdmin = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const userDoc = await User.findById(user._id).populate("roles");
    const roleNames = userDoc.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role === "Super User" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin access:", error);
    return res.status(500).json({ message: "Error checking admin access", error: error.message });
  }
};

// Get questionnaire by ID (for admin review)
router.get(
  "/admin/:id",
  verifyToken,
  checkAdmin,
  getQuestionnaireById
);

// Update questionnaire status (Admin only)
router.put(
  "/admin/:id/status",
  verifyToken,
  checkAdmin,
  updateQuestionnaireStatus
);

// Editar (reemplaza campos)
router.put(
  "/:userId",
  verifyToken,
  updateQuestionnaire
);

// Obtener por usuario
router.get(
  "/:userId",
  verifyToken,
  getQuestionnaireByUser
);

// Eliminar por usuario
router.delete(
  "/:userId",
  verifyToken,
  deleteQuestionnaire
);

export default router;
