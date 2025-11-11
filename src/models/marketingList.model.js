import mongoose from "mongoose";

/**
 * Marketing List Model
 * Manages segmented email lists for marketing campaigns
 */
const marketingListSchema = new mongoose.Schema(
  {
    // List name
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    // List description
    description: {
      type: String,
      trim: true,
    },
    // List type/category
    category: {
      type: String,
      enum: [
        "all_users",
        "verified_catholics",
        "subscribers",
        "free_users",
        "active_listings",
        "event_attendees",
        "inactive_users",
        "custom",
      ],
      default: "custom",
      index: true,
    },
    // Segmentation criteria (for dynamic lists)
    segmentation: {
      // User status filters
      userStatus: {
        verified: { type: Boolean, default: null }, // null = any, true = verified only, false = unverified only
        hasSubscription: { type: Boolean, default: null },
        hasActiveListing: { type: Boolean, default: null },
        hasAttendedEvent: { type: Boolean, default: null },
      },
      // Date filters
      dateFilters: {
        registeredAfter: { type: Date, default: null },
        registeredBefore: { type: Date, default: null },
        lastActiveAfter: { type: Date, default: null },
        lastActiveBefore: { type: Date, default: null },
      },
      // Subscription filters
      subscriptionFilters: {
        planIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Plan" }],
        activeOnly: { type: Boolean, default: true },
      },
      // Location filters
      locationFilters: {
        states: [{ type: String, trim: true }],
        cities: [{ type: String, trim: true }],
      },
      // Custom query (advanced)
      customQuery: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
    },
    // Static member list (for manual lists)
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        tags: [{ type: String, trim: true }],
      },
    ],
    // List settings
    settings: {
      // Auto-update dynamic lists
      autoUpdate: {
        type: Boolean,
        default: true,
      },
      // Update frequency (for dynamic lists)
      updateFrequency: {
        type: String,
        enum: ["realtime", "daily", "weekly", "monthly"],
        default: "daily",
      },
      // Last update timestamp
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      // Exclude unsubscribed users
      excludeUnsubscribed: {
        type: Boolean,
        default: true,
      },
    },
    // List metadata
    metadata: {
      totalMembers: { type: Number, default: 0 },
      lastMemberCount: { type: Number, default: 0 },
      lastCountUpdate: { type: Date, default: Date.now },
    },
    // Active status
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Created by
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
marketingListSchema.index({ category: 1, active: 1 });
marketingListSchema.index({ "members.user": 1 });
marketingListSchema.index({ createdBy: 1 });

export default mongoose.model("MarketingList", marketingListSchema);

