import Message from "../models/message.model.js";

// Get all media files by user (based on sender field)
export const getUserMedia = async (req, res) => {
  const { userId } = req.params;

  try {
    const mediaMessages = await Message.find({
      sender: userId,
      fileUrl: { $ne: null }, // fileUrl must not be null
    }).select("fileType fileUrl createdAt");

    res.status(200).json({ count: mediaMessages.length, media: mediaMessages });
  } catch (error) {
    console.error("Error fetching user media:", error);
    res.status(500).json({ error: "Failed to fetch user media" });
  }
};

// Get all media files in a chat, optionally filtered by type
export const getChatMedia = async (req, res) => {
  const { chatId } = req.params;
  const { type } = req.query;

  const filter = {
    chatId,
    fileUrl: { $ne: null }, // fileUrl must not be null
  };

  if (type) {
    filter.fileType = type;
  }

  try {
    const mediaMessages = await Message.find(filter).select("fileType fileUrl createdAt");

    res.status(200).json({ count: mediaMessages.length, media: mediaMessages });
  } catch (error) {
    console.error("Error fetching chat media:", error);
    res.status(500).json({ error: "Failed to fetch chat media" });
  }
};
