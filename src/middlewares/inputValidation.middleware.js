/**
 * Input Validation Middleware
 * Note: For full express-validator features, install: npm install express-validator
 * This version provides basic validation without external dependencies
 */

// Simple validation result structure
class ValidationError extends Error {
  constructor(field, message, value) {
    super(message);
    this.field = field;
    this.value = value;
  }
}

/**
 * Validation error storage
 */
const validationErrors = [];

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  if (validationErrors.length > 0) {
    const errors = [...validationErrors];
    validationErrors.length = 0; // Clear errors
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.map((err) => ({
        field: err.field,
        message: err.message,
        value: err.value,
      })),
    });
  }
  next();
};

/**
 * Add validation error
 */
const addError = (field, message, value) => {
  validationErrors.push({ field, message, value });
};

/**
 * Sanitize string input
 */
const sanitizeString = (value) => {
  if (typeof value !== "string") return value;
  // Remove null bytes and trim
  return value.replace(/\0/g, "").trim();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration = (req, res, next) => {
  validationErrors.length = 0; // Clear previous errors

  const { email, password, first_name, last_name } = req.body;

  // Email validation
  if (!email) {
    addError("email", "Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addError("email", "Valid email is required", email);
    } else {
      req.body.email = email.toLowerCase().trim();
    }
  }

  // Password validation
  if (!password) {
    addError("password", "Password is required");
  } else if (password.length < 8) {
    addError("password", "Password must be at least 8 characters");
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    addError("password", "Password must contain at least one uppercase letter, one lowercase letter, and one number");
  }

  // First name validation
  if (first_name !== undefined) {
    const sanitized = sanitizeString(first_name);
    if (sanitized.length < 1 || sanitized.length > 50) {
      addError("first_name", "First name must be between 1 and 50 characters", first_name);
    } else {
      req.body.first_name = sanitized;
    }
  }

  // Last name validation
  if (last_name !== undefined) {
    const sanitized = sanitizeString(last_name);
    if (sanitized.length < 1 || sanitized.length > 50) {
      addError("last_name", "Last name must be between 1 and 50 characters", last_name);
    } else {
      req.body.last_name = sanitized;
    }
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Validation rules for login
 */
export const validateLogin = (req, res, next) => {
  validationErrors.length = 0;

  const { email, password } = req.body;

  if (!email) {
    addError("email", "Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addError("email", "Valid email is required", email);
    } else {
      req.body.email = email.toLowerCase().trim();
    }
  }

  if (!password) {
    addError("password", "Password is required");
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Validation rules for marketplace listing
 */
export const validateMarketplaceListing = (req, res, next) => {
  validationErrors.length = 0;

  const { title, description, category, price, currency, condition } = req.body;

  // Title validation
  if (!title) {
    addError("title", "Title is required");
  } else {
    const sanitized = sanitizeString(title);
    if (sanitized.length < 3 || sanitized.length > 200) {
      addError("title", "Title must be between 3 and 200 characters", title);
    } else {
      req.body.title = sanitized;
    }
  }

  // Description validation
  if (description !== undefined) {
    const sanitized = sanitizeString(description);
    if (sanitized.length > 5000) {
      addError("description", "Description must be less than 5000 characters", description);
    } else {
      req.body.description = sanitized;
    }
  }

  // Category validation
  if (!category) {
    addError("category", "Category is required");
  } else {
    req.body.category = sanitizeString(category);
  }

  // Price validation
  if (price === undefined || price === null) {
    addError("price", "Price is required");
  } else {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      addError("price", "Price must be a positive number", price);
    } else {
      req.body.price = priceNum;
    }
  }

  // Currency validation
  if (currency !== undefined) {
    const allowedCurrencies = ["USD", "EUR", "GBP"];
    if (!allowedCurrencies.includes(currency)) {
      addError("currency", "Currency must be USD, EUR, or GBP", currency);
    }
  }

  // Condition validation
  if (condition !== undefined) {
    const allowedConditions = ["new", "like-new", "excellent", "good", "fair", "poor"];
    if (!allowedConditions.includes(condition)) {
      addError("condition", "Invalid condition value", condition);
    }
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Validation rules for user ID parameter
 */
export const validateUserId = (req, res, next) => {
  validationErrors.length = 0;
  const { id } = req.params;
  
  // MongoDB ObjectId validation (24 hex characters)
  const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
  if (!mongoIdRegex.test(id)) {
    addError("id", "Invalid user ID format", id);
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Validation rules for pagination
 */
export const validatePagination = (req, res, next) => {
  validationErrors.length = 0;
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      addError("page", "Page must be a positive integer", page);
    } else {
      req.query.page = pageNum;
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      addError("limit", "Limit must be between 1 and 100", limit);
    } else {
      req.query.limit = limitNum;
    }
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Validation rules for email
 */
export const validateEmail = (req, res, next) => {
  validationErrors.length = 0;
  const { email } = req.body;

  if (!email) {
    addError("email", "Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addError("email", "Valid email is required", email);
    } else {
      req.body.email = email.toLowerCase().trim();
    }
  }

  return handleValidationErrors(req, res, next);
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== "object" || obj === null) {
    return typeof obj === "string" ? sanitizeString(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeRequestBody = (req, res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};

export default {
  validateRegistration,
  validateLogin,
  validateMarketplaceListing,
  validateUserId,
  validatePagination,
  validateEmail,
  sanitizeRequestBody,
  handleValidationErrors,
};

