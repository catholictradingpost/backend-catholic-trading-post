/**
 * Category validation with hard rules for classifieds
 * 
 * Rules:
 * - Autos: sedan/hatchback only; maybe motorcycle (toggle)
 * - Block: SUVs, trucks, heavy duty, boats, electronics (phones, computers, TVs, tablets)
 * - Items: books, art, antiques; tangible goods only
 * - Free category bypasses payment
 */

// Allowed categories
export const ALLOWED_CATEGORIES = {
  // Automobiles (with restrictions)
  'automobiles': {
    name: 'Automobiles',
    allowedTypes: ['sedan', 'hatchback', 'motorcycle'], // Vehicle types allowed
    requiresAutoDetails: true,
    pricing: 10 // $10 per post
  },
  'cars': {
    name: 'Cars',
    allowedTypes: ['sedan', 'hatchback', 'motorcycle'],
    requiresAutoDetails: true,
    pricing: 10
  },
  
  // Allowed items
  'books': {
    name: 'Books',
    requiresAutoDetails: false,
    pricing: 4 // $4 per post
  },
  'art': {
    name: 'Art',
    requiresAutoDetails: false,
    pricing: 4
  },
  'antiques': {
    name: 'Antiques',
    requiresAutoDetails: false,
    pricing: 4
  },
  'religious-art': {
    name: 'Religious Art',
    requiresAutoDetails: false,
    pricing: 4
  },
  'religious-items': {
    name: 'Religious Items',
    requiresAutoDetails: false,
    pricing: 4
  },
  'misc': {
    name: 'Miscellaneous',
    requiresAutoDetails: false,
    pricing: 4
  },
  'other': {
    name: 'Other',
    requiresAutoDetails: false,
    pricing: 4
  },
  
  // Free category (bypasses payment)
  'free': {
    name: 'Free Items',
    requiresAutoDetails: false,
    pricing: 0 // Free - bypasses payment
  }
};

// Blocked categories (not allowed)
export const BLOCKED_CATEGORIES = [
  'suv',
  'suvs',
  'truck',
  'trucks',
  'heavy-duty',
  'heavy duty',
  'boat',
  'boats',
  'electronics',
  'phone',
  'phones',
  'computer',
  'computers',
  'tv',
  'tvs',
  'television',
  'televisions',
  'tablet',
  'tablets',
  'laptop',
  'laptops',
  'smartphone',
  'smartphones'
];

// Blocked vehicle types (for automobiles category)
export const BLOCKED_VEHICLE_TYPES = [
  'suv',
  'truck',
  'pickup',
  'van',
  'minivan',
  'heavy-duty',
  'commercial'
];

/**
 * Validate category
 * @param {string} category - Category name
 * @param {object} autoDetails - Auto details (if category is automobiles)
 * @returns {object} - Validation result { valid: boolean, error?: string, categoryInfo?: object }
 */
export function validateCategory(category, autoDetails = null) {
  if (!category) {
    return { valid: false, error: 'Category is required' };
  }

  const normalizedCategory = category.toLowerCase().trim();

  // Check if category is blocked
  if (BLOCKED_CATEGORIES.includes(normalizedCategory)) {
    return {
      valid: false,
      error: `Category "${category}" is not allowed. Blocked categories include: SUVs, trucks, heavy duty vehicles, boats, and electronics.`
    };
  }

  // Check if category is allowed
  const categoryInfo = ALLOWED_CATEGORIES[normalizedCategory];
  if (!categoryInfo) {
    return {
      valid: false,
      error: `Category "${category}" is not recognized. Allowed categories: ${Object.keys(ALLOWED_CATEGORIES).join(', ')}`
    };
  }

  // Validate auto details if required
  if (categoryInfo.requiresAutoDetails) {
    if (!autoDetails || !autoDetails.vehicleType) {
      return {
        valid: false,
        error: 'Vehicle type is required for automobile listings'
      };
    }

    const vehicleType = autoDetails.vehicleType.toLowerCase().trim();
    
    // Check if vehicle type is blocked
    if (BLOCKED_VEHICLE_TYPES.includes(vehicleType)) {
      return {
        valid: false,
        error: `Vehicle type "${autoDetails.vehicleType}" is not allowed. Only sedan, hatchback, and motorcycle are permitted.`
      };
    }

    // Check if vehicle type is in allowed list
    if (!categoryInfo.allowedTypes.includes(vehicleType)) {
      return {
        valid: false,
        error: `Vehicle type "${autoDetails.vehicleType}" is not allowed for this category. Allowed types: ${categoryInfo.allowedTypes.join(', ')}`
      };
    }
  }

  return {
    valid: true,
    categoryInfo: {
      ...categoryInfo,
      normalizedName: normalizedCategory
    }
  };
}

/**
 * Check if category is free (bypasses payment)
 * @param {string} category - Category name
 * @param {number} price - Item price
 * @returns {boolean} - True if category/price is free
 */
export function isFreeCategory(category, price = null) {
  const normalizedCategory = category?.toLowerCase().trim();
  
  // Free items (price = 0) always bypass payment
  if (price !== null && price === 0) {
    return true;
  }
  
  // Free category bypasses payment
  if (normalizedCategory === 'free') {
    return true;
  }
  
  return false;
}

/**
 * Get category pricing
 * @param {string} category - Category name
 * @param {number} price - Item price
 * @returns {number} - Credit cost (0 for free)
 */
export function getCategoryPricing(category, price = null) {
  if (isFreeCategory(category, price)) {
    return 0;
  }

  const normalizedCategory = category?.toLowerCase().trim();
  const categoryInfo = ALLOWED_CATEGORIES[normalizedCategory];
  
  return categoryInfo?.pricing || 4; // Default to $4 if not found
}

/**
 * Get all allowed categories
 * @returns {array} - Array of allowed category objects
 */
export function getAllowedCategories() {
  return Object.entries(ALLOWED_CATEGORIES).map(([key, value]) => ({
    key,
    name: value.name,
    pricing: value.pricing,
    requiresAutoDetails: value.requiresAutoDetails,
    allowedTypes: value.allowedTypes || null
  }));
}

export default {
  validateCategory,
  isFreeCategory,
  getCategoryPricing,
  getAllowedCategories,
  ALLOWED_CATEGORIES,
  BLOCKED_CATEGORIES,
  BLOCKED_VEHICLE_TYPES
};

