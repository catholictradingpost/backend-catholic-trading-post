import express from 'express';
import { verifyToken } from '../middlewares/authJwt.middleware.js';
import { 
    getAllVerifications, 
    getVerificationById, 
    createVerification, 
    updateVerificationStatus, 
    deleteVerification,
    updateOwnVerification } 
from '../controllers/verification.controller.js';
import { checkPermission } from '../middlewares/checkPermission.middleware.js';
import { logAction } from '../middlewares/log.middleware.js';

const router = express.Router();

// List of all verifications with pagination and filters
router.get('/all', verifyToken, checkPermission("verification", "read"), logAction("read", "verification"), getAllVerifications);

// Get a specific verification by ID
router.get('/getById/:id', verifyToken, checkPermission("verification", "read"), logAction("read", "verification"), getVerificationById);

// Create a new verification
router.post('/create', verifyToken, logAction("create", "verification"), createVerification);

//Update a verification by ID (only the creator can)
router.put('/update/:id', verifyToken, logAction("update", "verification"), updateOwnVerification);

// Update a verification status 
router.put('/:id/status', verifyToken, checkPermission("verification", "update"), logAction("update", "verification"), updateVerificationStatus);

// Delete a verification
router.delete('/delete/:id', verifyToken, checkPermission("verification", "delete"), logAction("delete", "verification"), deleteVerification);

export default router;
