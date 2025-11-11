import Post from "../models/post.model.js";
import Reaction from "../models/reaction.model.js";
import imagekit from "../utils/imagekit.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";

// Subir archivo base64 a ImageKit
const uploadToImageKit = async ({ base64, name, mime }) => {
  if (!base64 || !name || !mime) {
    throw new Error("Faltan campos requeridos para subir el archivo a ImageKit");
  }

  const uploaded = await imagekit.upload({
    file: base64,
    fileName: `${Date.now()}-${name.replace(/\s+/g, "_")}`,
    folder: "/posts",
  });

  return {
    url: uploaded.url,
    name,
    file_type: mime.split("/")[0],
  };
};

// Obtener posts filtrados
export const getFilteredPosts = async (req, res) => {
  try {
    const { author_id, date, startDate, endDate, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (author_id) filter.author_id = author_id;

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(targetDate.getDate() + 1);
      filter.createdAt = { $gte: targetDate, $lt: nextDay };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      filter.createdAt = { $gte: start, $lt: end };
    }

    const [total, posts] = await Promise.all([
      Post.countDocuments(filter),
      Post.find(filter)
        .skip(skip)
        .limit(limitNumber)
        .populate("author_id", "first_name last_name email")
        .exec(),
    ]);

    const postsWithReactions = await Promise.all(
      posts.map(async (post) => {
        const reactions = await Reaction.aggregate([
          { $match: { post: post._id } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
        ]);

        const reactionCounts = { like: 0, dislike: 0 };
        reactions.forEach((r) => (reactionCounts[r._id] = r.count));

        return {
          ...post.toObject(),
          reactions: reactionCounts,
        };
      })
    );
    console.log(postsWithReactions)

    res.status(200).json({
      message: "Filtered posts fetched successfully",
      currentPage: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      totalPosts: total,
      posts: postsWithReactions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching filtered posts", error: error.message });
  }
};

// Obtener un post por ID
export const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId).populate("author_id", "first_name last_name email");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const reactions = await Reaction.aggregate([
      { $match: { post: post._id } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    const reactionCounts = { like: 0, dislike: 0 };
    reactions.forEach((r) => (reactionCounts[r._id] = r.count));

    res.status(200).json({
      message: "Post fetched successfully",
      post: {
        ...post.toObject(),
        reactions: reactionCounts,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching post", error: error.message });
  }
};

// Crear un post con base64
export const createPost = async (req, res) => {
  try {
    const { title, content, type, author_id, attachments = [] } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required." });

    const userId = req.userId || author_id;
    const postingPolicy = req.postingPolicy;

    // Deduct credits if required (pay-per-post)
    // Free users and unlimited subscription users skip credit deduction
    if (postingPolicy && postingPolicy.deductCredits && postingPolicy.type !== 'free_user' && postingPolicy.type !== 'unlimited_subscription') {
      const creditCost = postingPolicy.creditCost || 1;
      
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Atomic credit deduction to prevent race conditions
      if (postingPolicy.subscription && postingPolicy.subscription._id) {
        // Try to deduct from subscription credits first (atomic operation)
        const subscription = await Subscription.findOneAndUpdate(
          { 
            _id: postingPolicy.subscription._id,
            postCredits: { $gte: creditCost }
          },
          { $inc: { postCredits: -creditCost } },
          { new: true }
        );

        if (subscription) {
          // Successfully deducted from subscription credits
          // Credits deducted, continue with post creation
        } else {
          // Subscription credits insufficient, try user credits (atomic operation)
          const updatedUser = await User.findOneAndUpdate(
            { 
              _id: userId,
              postCredits: { $gte: creditCost }
            },
            { $inc: { postCredits: -creditCost } },
            { new: true }
          );

          if (!updatedUser) {
            // Get current balances for error message
            const currentSubscription = await Subscription.findById(postingPolicy.subscription._id);
            const currentUser = await User.findById(userId);
            return res.status(403).json({
              message: `Insufficient credits. You need ${creditCost} credit(s) to create a post.`,
              availableCredits: (currentUser?.postCredits || 0) + (currentSubscription?.postCredits || 0),
              requiredCredits: creditCost,
            });
          }
        }
      } else {
        // Deduct from user credits only (atomic operation)
        const updatedUser = await User.findOneAndUpdate(
          { 
            _id: userId,
            postCredits: { $gte: creditCost }
          },
          { $inc: { postCredits: -creditCost } },
          { new: true }
        );

        if (!updatedUser) {
          const currentUser = await User.findById(userId);
          return res.status(403).json({
            message: `Insufficient credits. You need ${creditCost} credit(s) to create a post. You have ${currentUser?.postCredits || 0} credit(s).`,
            availableCredits: currentUser?.postCredits || 0,
            requiredCredits: creditCost,
          });
        }
      }
    }

    const newPost = new Post({ title, content, type, author_id: userId });

    if (Array.isArray(attachments) && attachments.length > 0) {
      const uploadedAttachments = await Promise.all(
        attachments.map(uploadToImageKit)
      );
      newPost.attachments = uploadedAttachments;
    }

    await newPost.save();
    const populatedPost = await newPost.populate("author_id", "first_name last_name email");

    res.status(201).json({
      message: "Post created successfully",
      post: populatedPost,
      creditsDeducted: postingPolicy?.deductCredits ? (postingPolicy.creditCost || 0) : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating post", error: error.message });
  }
};

// Actualizar un post con nuevos adjuntos base64
export const updatePost = async (req, res) => {
  try {
    const { title, content, type, attachments = [] } = req.body;
    const postId = req.params.id;

    if (!title) return res.status(400).json({ message: "Title is required." });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    post.title = title;
    post.content = content;
    post.type = type;

    if (Array.isArray(attachments) && attachments.length > 0) {
      const newAttachments = await Promise.all(attachments.map(uploadToImageKit));
      post.attachments.push(...newAttachments);
    }

    await post.save();
    const populatedPost = await post.populate("author_id", "first_name last_name email");

    res.status(200).json({
      message: "Post updated successfully",
      post: populatedPost,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating post", error: error.message });
  }
};

// Eliminar un post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.post_id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // (Opcional) Eliminar de ImageKit: requiere guardar fileId en attachments

    await Post.findByIdAndDelete(postId);
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting post", error: error.message });
  }
};
