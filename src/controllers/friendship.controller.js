import Friendship from '../models/friendship.model.js';
import User from '../models/user.model.js';

// 1. Enviar solicitud
export const sendRequest = async (req, res) => {
  const { recipientId } = req.body;
  const requester = req.userId;

  if (requester === recipientId)
    return res.status(400).json({ message: "No puedes enviarte solicitud a ti mismo." });

  try {
    const existing = await Friendship.findOne({
      $or: [
        { requester, recipient: recipientId },
        { requester: recipientId, recipient: requester }
      ]
    });
    if (existing)
      return res.status(400).json({ message: "Ya existe una relación con este usuario." });

    const fr = new Friendship({ requester, recipient: recipientId });
    await fr.save();
    return res.status(201).json({ message: 'Solicitud enviada.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 2. Listar solicitudes recibidas
export const getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({ recipient: req.userId, status: 'pending' })
      .populate('requester','first_name last_name email');
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 3. Aceptar o rechazar
export const respondRequest = async (req, res) => {
  const { id } = req.params; // id del Friendship
  const { action } = req.body; // 'accept' o 'decline'
  try {
    const fr = await Friendship.findById(id);
    if (!fr) return res.status(404).json({ message: 'Solicitud no encontrada.' });
    if (fr.recipient.toString() !== req.userId)
      return res.status(403).json({ message: 'No puedes responder esta solicitud.' });

    fr.status = action === 'accept' ? 'accepted' : 'declined';
    await fr.save();
    return res.json({ message: `Solicitud ${fr.status}.` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 4. Listar amigos (todas las relaciones accepted)
export const getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.userId, status: 'accepted' },
        { recipient: req.userId, status: 'accepted' },
      ]
    });
    // extraer IDs
    const friendIds = friendships.map(f =>
      f.requester.toString() === req.userId ? f.recipient : f.requester
    );
    const friends = await User.find({ _id: { $in: friendIds } }).select('first_name last_name email');
    return res.json(friends);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 5. Eliminar amistad
export const removeFriend = async (req, res) => {
  const { id } = req.params; // id del Friendship o friend userId? mejor Friendship ID
  try {
    const fr = await Friendship.findById(id);
    if (!fr) return res.status(404).json({ message: 'Relación no encontrada.' });
    if (![fr.requester.toString(), fr.recipient.toString()].includes(req.userId))
      return res.status(403).json({ message: 'No puedes eliminar esta relación.' });
    await fr.deleteOne();
    return res.json({ message: 'Amistad eliminada.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
