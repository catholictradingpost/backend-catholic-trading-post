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
import { checkPermission } from "../middlewares/checkPermission.middleware.js";

const router = express.Router();

// Crear (solo si no existe)
router.post(
  "/",
  verifyToken,
  createQuestionnaire
);

// Editar (reemplaza campos)
router.put(
  "/:userId",
  verifyToken,
  updateQuestionnaire
);

// Listar todos
router.get(
  "/all",
  verifyToken,
  getAllQuestionnaires
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

// Admin routes
// Get questionnaire by ID (for admin review)
router.get(
  "/admin/:id",
  verifyToken,
  checkPermission("questionnaire", "read"),
  getQuestionnaireById
);

// Update questionnaire status (Admin only)
router.put(
  "/admin/:id/status",
  verifyToken,
  checkPermission("questionnaire", "update"),
  updateQuestionnaireStatus
);

export default router;
