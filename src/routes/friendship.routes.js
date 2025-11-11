import express from 'express';
import {
  sendRequest,
  getPendingRequests,
  respondRequest,
  getFriends,
  removeFriend
} from '../controllers/friendship.controller.js';
import { verifyToken } from '../middlewares/authJwt.middleware.js';

const router = express.Router();

// 1. Enviar solicitud
router.post('/request', verifyToken, sendRequest);

// 2. Listar solicitudes pendientes
router.get('/requests', verifyToken, getPendingRequests);

// 3. Responder solicitud
router.put('/request/:id', verifyToken, respondRequest);

// 4. Listar lista de amigos
router.get('/friends', verifyToken, getFriends);

// 5. Eliminar amistad
router.delete('/:id', verifyToken, removeFriend);

export default router;
