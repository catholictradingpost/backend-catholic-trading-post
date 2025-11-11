import express from "express";
import multer from "multer";
import {
  createMarketplace,
  getMarketplaces,
  getMarketplaceById,
  updateMarketplace,
  deleteMarketplace,
  setCoverImage,
  deleteImage,
  updateListingStatus,
  markAsSold,
  activateListing,
  getUserListings,
  approveListing,
  rejectListing,
  getAllowedCategories,
} from "../controllers/marketplace.controller.js";
import { verifyToken } from "../middlewares/authJwt.middleware.js";
import { checkPostingPolicy } from "../middlewares/postingPolicy.middleware.js";
import { moderateContentMiddleware } from "../middlewares/contentModeration.middleware.js";
import { logAdminAction } from "../middlewares/auditLog.middleware.js";
import { scanUploadedFiles } from "../middlewares/fileScanning.middleware.js";
import { validateMarketplaceListing } from "../middlewares/inputValidation.middleware.js";

const router = express.Router();

// Configuración de multer para almacenar archivos en memoria
const multerMemory = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // Limite 10MB por archivo
    files: 8 // Maximum 8 images per listing
  },
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes jpeg, jpg, png, webp
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimeType = allowedTypes.test(file.mimetype.toLowerCase());
    const extName = allowedTypes.test(
      file.originalname.toLowerCase().split(".").pop()
    );
    if (mimeType && extName) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpeg, .jpg, .png, and .webp files are allowed"));
    }
  },
});

// Rutas

// Listar y filtrar items
router.get("/all", getMarketplaces);

// Obtener detalle de un item
router.get("/:id", getMarketplaceById);

// Crear item (con fotos)
router.post(
  "/create",
  verifyToken,
  multerMemory.array("images", 8), // Maximum 8 images per listing
  scanUploadedFiles, // File scanning and validation
  validateMarketplaceListing, // Input validation
  moderateContentMiddleware, // Content moderation (Catholic guidelines)
  checkPostingPolicy, // Apply posting policy with category-based pricing
  createMarketplace
);

// Actualizar item (añadir fotos)
router.put(
  "/update/:id",
  verifyToken,
  multerMemory.array("images", 8), // Maximum 8 images per listing
  scanUploadedFiles, // File scanning and validation
  validateMarketplaceListing, // Input validation
  moderateContentMiddleware, // Content moderation (Catholic guidelines)
  updateMarketplace
);

// Eliminar item
router.delete("/delete/:id", verifyToken, deleteMarketplace);

// Set cover image
router.put("/:id/cover", verifyToken, setCoverImage);

// Delete image from listing
router.delete("/:id/image", verifyToken, deleteImage);

// Status management
router.put("/:id/status", verifyToken, updateListingStatus);
router.put("/:id/sold", verifyToken, markAsSold);
router.put("/:id/activate", verifyToken, activateListing);

// Get user's listings
router.get("/user/listings", verifyToken, getUserListings);

// Get allowed categories
router.get("/categories/allowed", getAllowedCategories);

// Moderation endpoints (admin only)
router.put(
  "/:id/moderation/approve",
  verifyToken,
  logAdminAction("approve", "listing", {
    resourceType: "Marketplace",
    resourceIdFrom: "id",
  }),
  approveListing
);
router.put(
  "/:id/moderation/reject",
  verifyToken,
  logAdminAction("reject", "listing", {
    resourceType: "Marketplace",
    resourceIdFrom: "id",
    includeRequestBody: true,
  }),
  rejectListing
);

// Note: For client-side direct upload, use:
// POST /api/upload/signature - Get signed upload parameters
// POST /api/upload/validate - Validate uploaded image and get thumbnails

export default router;
