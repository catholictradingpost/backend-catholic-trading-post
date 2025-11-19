/**
 * Category-based pricing configuration for pay-per-post
 * Automobiles = $10, General items / All other items = $4, Free items = $0
 */

// Category mapping for pricing
// Automobiles = $10, All other categories = $4, Free items = $0
const CATEGORY_PRICING = {
  // Automobiles - $10 (10 credits)
  'Cars': 10,
  'Automobiles': 10,
  'cars': 10,
  'automobiles': 10,
  
  // General items / All other items - $4 (4 credits)
  'Religious Art': 4,
  'Religious Items': 4,
  'Books': 4,
  'Other': 4,
  'religious-art': 4,
  'religious-items': 4,
  'books': 4,
  'other': 4,
  'Art': 4,
  'art': 4,
  'Misc': 4,
  'misc': 4,
  'miscellaneous': 4,
  'Miscellaneous': 4,
  'antiques': 4,
  'Antiques': 4,
};

/**
 * Get the credit cost for posting based on category and item price
 * @param {string} category - The category of the item
 * @param {number} itemPrice - The price of the item (0 for free items)
 * @returns {number} - Credit cost for posting
 */
export function getPostingCost(category, itemPrice = null) {
  // Free items (price = 0) always cost 0 credits
  if (itemPrice !== null && itemPrice === 0) {
    return 0;
  }
  
  // Check for free category (synchronous check)
  const normalizedCategory = category?.toLowerCase().trim();
  if (normalizedCategory === 'free') {
    return 0;
  }
  
  // Check category validation pricing first (if available)
  // Note: This will be imported dynamically in the middleware/controller
  // For now, use legacy pricing as fallback
  
  // Fallback to legacy category pricing
  if (normalizedCategory && CATEGORY_PRICING[normalizedCategory] !== undefined) {
    return CATEGORY_PRICING[normalizedCategory];
  }
  
  // Default pricing for unknown categories - treat as general items ($4)
  // All non-automobile categories default to $4
  return 4;
}

/**
 * Get pricing information for a category
 * @param {string} category - The category to check
 * @returns {object} - Pricing information with cost and description
 */
export function getPricingInfo(category) {
  const cost = getPostingCost(category);
  
  const descriptions = {
    10: 'Automobiles cost $10 per post',
    4: 'General items / All other items cost $4 per post',
    0: 'Free items cost $0 per post (always free, even for free accounts)'
  };
  
  return {
    cost,
    description: descriptions[cost] || 'Standard pricing applies',
    category: category || 'Unknown'
  };
}

/**
 * Get all available categories with their pricing
 * @returns {array} - Array of category objects with pricing info
 */
export function getAllCategoryPricing() {
  const categories = [
    { name: 'Automobiles', cost: 10, description: 'Automobiles - $10 per post' },
    { name: 'General Items', cost: 4, description: 'General items / All other items - $4 per post' },
    { name: 'Free Items', cost: 0, description: 'Free items (price = $0) - Always free, even for free accounts' }
  ];
  
  return categories;
}

export default {
  getPostingCost,
  getPricingInfo,
  getAllCategoryPricing,
  CATEGORY_PRICING
};

