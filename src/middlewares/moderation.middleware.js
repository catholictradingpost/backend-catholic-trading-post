import axios from "axios";
import { PORT_PYTHON } from "../config.js";
export const moderateText = async (req, res, next) => {
  const { text } = req.body;

  // Skip moderation if Python service is not configured
  if (!PORT_PYTHON) {
    return next();
  }

  // Only apply moderation for text messages
  if (text) {
    try {
      const response = await axios.post(`http://localhost:${PORT_PYTHON}/api/moderate`, {
        text,
      });

      if (response.data.is_offensive) {
        return res.status(403).json({
          message: "Your message contains offensive content and cannot be sent.",
        });
      }
    } catch (error) {
      console.error("Moderation API error:", error.message);
      // If moderation service is unavailable, allow the message to pass
      // In production, you might want to handle this differently
      console.warn("Moderation service unavailable, allowing message");
    }
  }

  next(); // Continue to the next middleware or controller
};
