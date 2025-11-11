import express from "express";
import { deleteImage, updateImage } from "../controllers/image.controller.js";
import { upload } from "../middlewares/upload.middleware.js"; // Middleware to upload files

const router = express.Router();

// Route to delete an image
router.delete("/delete/:id", deleteImage); // Delete image by ID

// Route to modify an image (replace the previous one)
router.put("/update/:id", upload.single("image"), updateImage); // Upload a new image

export default router;
