import express from 'express';
import {
  createComment,
  getCommentsByPost,
  getRepliesByComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller.js';
import { verifyToken } from '../middlewares/authJwt.middleware.js';

const router = express.Router();

// Create a comment (either on a post or as a reply to another comment)
router.post('/create', verifyToken, createComment);

// Get top-level comments of a post
router.get('/post/:postId', verifyToken, getCommentsByPost);

// Get replies to a specific comment
router.get('/replies/:commentId', verifyToken, getRepliesByComment);

// Update a comment owned by the authenticated user
router.put('/update/:commentId', verifyToken, updateComment);

// Delete a comment owned by the authenticated user
router.delete('/delete/:commentId', verifyToken, deleteComment);

export default router;
