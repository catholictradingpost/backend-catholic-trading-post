import Reaction from '../models/reaction.model.js';
import Post from '../models/post.model.js';
import Notification from '../models/notification.model.js';
import { getIO, onlineUsers } from '../libs/socket.js';

export const reactToPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { type, userId } = req.body;

    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({ message: 'Invalid reaction type.' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    const existingReaction = await Reaction.findOne({ user: userId, post: postId });

    let isNewReaction = false;

    if (existingReaction) {
      if (existingReaction.type === type) {
        return res.status(400).json({ message: `You have already reacted with ${type} to this post.` });
      } else {
        existingReaction.type = type;
        await existingReaction.save();
      }
    } else {
      const reaction = new Reaction({ user: userId, post: postId, type });
      await reaction.save();
      isNewReaction = true;
    }

    // Create a notification
    if (post.author_id.toString() !== userId) {
      const notification = await Notification.create({
        user: post.author_id,
        title: 'New reaction',
        description: `Someone reacted with ${type} to your post.`,
      });

      // Emit real-time notification via socket.io
      const io = getIO();
      const recipientSocketId = onlineUsers.get(post.author_id.toString());
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', {
          title: notification.title,
          description: notification.description,
          timestamp: notification.createdAt,
        });
      }
    }

    res.status(isNewReaction ? 201 : 200).json({ message: `Reaction ${isNewReaction ? 'added' : 'updated'} as ${type}.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeReaction = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.userId;

    const reaction = await Reaction.findOneAndDelete({ user: userId, post: postId });
    if (!reaction) return res.status(404).json({ message: 'Reaction not found.' });

    res.status(200).json({ message: 'Reaction removed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
