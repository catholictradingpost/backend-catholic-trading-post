import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for messaging endpoints
 * Prevents spam and abuse
 */
export const messageRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 messages per minute
  message: 'Too many messages sent. Please wait a moment before sending another message.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain conditions (can be customized)
  skip: (req) => {
    // Add logic to skip for trusted users if needed
    return false;
  },
});

/**
 * Stricter rate limiter for new thread creation
 */
export const threadCreationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 new threads per 15 minutes
  message: 'Too many conversation threads created. Please wait before starting a new conversation.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  messageRateLimiter,
  threadCreationRateLimiter,
};

