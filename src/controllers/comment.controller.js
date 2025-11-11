import Comment from '../models/comment.model.js';
import Post from '../models/post.model.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import { getIO, onlineUsers } from '../libs/socket.js';

export const createComment = async (req, res) => {
  try {
    const { postId, parentId, content, userId } = req.body;

    if (!postId && !parentId) {
      return res.status(400).json({ message: 'postId or parentId is required.' });
    }

    const commentData = {
      user: userId,
      content,
    };

    let targetUserId = null;
    let targetType = null;

    if (postId) {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found.' });
      commentData.post = postId;
      targetUserId = post.author_id.toString();
      targetType = 'post';
    }

    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) return res.status(404).json({ message: 'Parent comment not found.' });
      commentData.parent = parentId;
      commentData.post = parentComment.post;
      targetUserId = parentComment.user.toString();
      targetType = 'comment';
    }

    const comment = new Comment(commentData);
    await comment.save();

    // Notify the target user if it's not the same as the one commenting
    if (targetUserId && targetUserId !== userId) {
      const notification = await Notification.create({
        user: targetUserId,
        title: 'New comment',
        description: `Someone commented on your ${targetType}.`,
      });

      // Emit real-time notification if the user is online
      const io = getIO();
      const recipientSocketId = onlineUsers.get(targetUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', {
          title: notification.title,
          description: notification.description,
          timestamp: notification.createdAt,
        });
      }
    }

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content, userId } = req.body;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    // Ensure user is the owner of the comment
    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: 'You do not have permission to edit this comment.' });
    }

    comment.content = content;
    await comment.save();

    // Notify the author of the post or parent comment (if any)
    const post = await Post.findById(comment.post);
    const targetUserId = comment.parent
      ? (await Comment.findById(comment.parent)).user.toString()
      : post?.author_id.toString();

    if (targetUserId && targetUserId !== userId) {
      const notification = await Notification.create({
        user: targetUserId,
        title: 'Comment updated',
        description: `Someone edited a comment on your ${comment.parent ? 'comment' : 'post'}.`,
      });

      // Emit real-time notification
      const io = getIO();
      const recipientSocketId = onlineUsers.get(targetUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new_notification', {
          title: notification.title,
          description: notification.description,
          timestamp: notification.createdAt,
        });
      }
    }

    res.status(200).json({ message: 'Comment successfully updated.', comment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ post: postId, parent: null })
      .populate('user', 'first_name last_name email')
      .sort({ createdAt: -1 });

    res.status(200).json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getRepliesByComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const replies = await Comment.find({ parent: commentId })
      .populate('user', 'first_name last_name email')
      .sort({ createdAt: 1 });

    res.status(200).json(replies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    // Ensure user is the owner of the comment
    if (comment.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this comment.' });
    }

    await comment.deleteOne();

    res.status(200).json({ message: 'Comment successfully deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
