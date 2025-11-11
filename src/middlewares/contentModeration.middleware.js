import { moderateContent, moderateMultipleFields } from "../utils/contentModeration.js";

/**
 * Middleware to moderate content before saving
 * Checks title, description, and other text fields
 */
export const moderateContentMiddleware = async (req, res, next) => {
  try {
    // Fields to check based on request
    const contentFields = {};

    // Check common fields
    if (req.body.title) contentFields.title = req.body.title;
    if (req.body.description) contentFields.description = req.body.description;
    if (req.body.content) contentFields.content = req.body.content;
    if (req.body.text) contentFields.text = req.body.text;
    if (req.body.name) contentFields.name = req.body.name;

    // If no content to moderate, continue
    if (Object.keys(contentFields).length === 0) {
      return next();
    }

    // Moderate all fields
    const moderationResult = await moderateMultipleFields(contentFields);

    if (moderationResult.blocked) {
      // Find which fields are blocked
      const blockedFields = Object.entries(moderationResult.fields)
        .filter(([_, result]) => result.blocked)
        .map(([field, result]) => ({
          field,
          matches: result.matches,
          severity: result.severity,
        }));

      return res.status(403).json({
        message: "Content contains prohibited words or phrases per Catholic guidelines.",
        blocked: true,
        blockedFields,
        requiresModeration: true,
      });
    }

    // Attach moderation result to request for logging
    req.moderationResult = moderationResult;

    next();
  } catch (error) {
    console.error("Error in content moderation middleware:", error);
    // On error, allow content but log
    next();
  }
};

export default moderateContentMiddleware;

