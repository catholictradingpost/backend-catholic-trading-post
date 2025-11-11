import express from 'express';
import { reactToPost, removeReaction } from '../controllers/reaction.controller.js';
import { verifyToken } from '../middlewares/authJwt.middleware.js';

const router = express.Router();

// Create or update a reaction (like/dislike) to a post
router.post('/post/:postId', verifyToken, reactToPost);

// Delete a user's reaction from a post
router.delete('/post/:postId', verifyToken, removeReaction);

export default router;
