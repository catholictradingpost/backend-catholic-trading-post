import ModerationList from "../models/moderationList.model.js";

/**
 * Check content against moderation lists (blocklist/safelist)
 * @param {string} content - Content to check
 * @param {string} contentType - Type of content (word, phrase, category, topic)
 * @returns {Promise<Object>} - Moderation result
 */
export async function moderateContent(content, contentType = "word") {
  if (!content || typeof content !== "string") {
    return {
      allowed: true,
      blocked: false,
      matches: [],
    };
  }

  const normalizedContent = content.toLowerCase();

  try {
    // Get active blocklist entries
    const blocklist = await ModerationList.find({
      type: "blocklist",
      category: contentType,
      active: true,
    }).lean();

    // Get active safelist entries
    const safelist = await ModerationList.find({
      type: "safelist",
      category: contentType,
      active: true,
    }).lean();

    const matches = [];
    let blocked = false;

    // Check against blocklist
    for (const entry of blocklist) {
      let matched = false;
      const term = entry.caseSensitive ? entry.term : entry.term.toLowerCase();

      if (entry.matchType === "exact") {
        matched = entry.caseSensitive
          ? content === entry.term
          : normalizedContent === term;
      } else if (entry.matchType === "partial") {
        matched = entry.caseSensitive
          ? content.includes(entry.term)
          : normalizedContent.includes(term);
      } else if (entry.matchType === "regex") {
        try {
          const regex = new RegExp(entry.term, entry.caseSensitive ? "" : "i");
          matched = regex.test(content);
        } catch (e) {
          console.error(`Invalid regex pattern: ${entry.term}`, e);
        }
      }

      if (matched) {
        matches.push({
          term: entry.term,
          type: "blocklist",
          severity: entry.severity,
          reason: entry.reason,
          guidelineReference: entry.guidelineReference,
        });

        // Critical severity blocks immediately
        if (entry.severity === "critical") {
          blocked = true;
        }
      }
    }

    // Check against safelist (safelist overrides blocklist)
    for (const entry of safelist) {
      let matched = false;
      const term = entry.caseSensitive ? entry.term : entry.term.toLowerCase();

      if (entry.matchType === "exact") {
        matched = entry.caseSensitive
          ? content === entry.term
          : normalizedContent === term;
      } else if (entry.matchType === "partial") {
        matched = entry.caseSensitive
          ? content.includes(entry.term)
          : normalizedContent.includes(term);
      } else if (entry.matchType === "regex") {
        try {
          const regex = new RegExp(entry.term, entry.caseSensitive ? "" : "i");
          matched = regex.test(content);
        } catch (e) {
          console.error(`Invalid regex pattern: ${entry.term}`, e);
        }
      }

      if (matched) {
        // Remove any blocklist matches for this term
        const blocklistMatchIndex = matches.findIndex(
          (m) => m.term === entry.term && m.type === "blocklist"
        );
        if (blocklistMatchIndex !== -1) {
          matches.splice(blocklistMatchIndex, 1);
        }

        matches.push({
          term: entry.term,
          type: "safelist",
          reason: entry.reason,
        });

        // Safelist entries always allow
        blocked = false;
      }
    }

    // If there are any remaining blocklist matches, content is blocked
    if (!blocked && matches.some((m) => m.type === "blocklist")) {
      blocked = true;
    }

    return {
      allowed: !blocked,
      blocked: blocked,
      matches: matches,
      severity: matches.length > 0
        ? matches.reduce((max, m) => {
            const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            return severityOrder[m.severity] > severityOrder[max] ||
              !severityOrder[max]
              ? m.severity
              : max;
          }, "low")
        : null,
    };
  } catch (error) {
    console.error("Error in content moderation:", error);
    // On error, allow content (fail open) but log the error
    return {
      allowed: true,
      blocked: false,
      matches: [],
      error: error.message,
    };
  }
}

/**
 * Check multiple content fields at once
 * @param {Object} contentFields - Object with field names as keys and content as values
 * @returns {Promise<Object>} - Moderation results per field
 */
export async function moderateMultipleFields(contentFields) {
  const results = {};

  for (const [fieldName, content] of Object.entries(contentFields)) {
    if (content && typeof content === "string") {
      results[fieldName] = await moderateContent(content);
    }
  }

  // Overall result: blocked if any field is blocked
  const overallBlocked = Object.values(results).some((r) => r.blocked);

  return {
    allowed: !overallBlocked,
    blocked: overallBlocked,
    fields: results,
  };
}

export default {
  moderateContent,
  moderateMultipleFields,
};

