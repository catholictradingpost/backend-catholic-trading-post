import express from 'express';
import { verifyToken } from '../middlewares/authJwt.middleware.js';
import { 
  getUploadSignature, 
  validateUploadedImage
} from '../controllers/upload.controller.js';

const router = express.Router();

// Get signed upload signature (for client-side direct upload)
router.post(
  '/signature',
  verifyToken,
  getUploadSignature
);

// Validate uploaded image and get thumbnail URLs
router.post(
  '/validate',
  verifyToken,
  validateUploadedImage
);

export default router;


