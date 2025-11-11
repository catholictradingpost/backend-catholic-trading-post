import express from "express";
import multer from "multer";
import {
  getPostById,
  getFilteredPosts,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { checkPostingRequirements } from "../middlewares/postingRequirements.middleware.js";
import { checkPostingPolicy } from "../middlewares/postingPolicy.middleware.js";
import { moderateContentMiddleware } from "../middlewares/contentModeration.middleware.js";

const router = express.Router();

// Configuración de multer para almacenamiento en memoria
const multerMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // Límite de 20MB por archivo
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "audio/mpeg",  // mp3
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",      // xlsx
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido: " + file.mimetype));
    }
  },
});

// Rutas públicas
router.get("/all", getFilteredPosts);
router.get("/getById/:id", getPostById);

// Crear post (con archivos)
router.post(
  "/create",
  verifyToken,
  checkPostingRequirements,
  moderateContentMiddleware, // Content moderation (Catholic guidelines)
  checkPostingPolicy,
  multerMemory.array("attachments", 10), // hasta 10 archivos
  createPost
);

// Actualizar post (con archivos)
router.put(
  "/update/:id",
  verifyToken,
  checkPostingRequirements,
  moderateContentMiddleware, // Content moderation (Catholic guidelines)
  multerMemory.array("attachments", 10),
  updatePost
);

// Eliminar post
router.delete("/delete/:post_id", verifyToken, deletePost);

export default router;
