import mongoose from "mongoose";

/**
 * Group Model for Catholic Trading Post
 * Tracks community groups including Bible study, youth ministry, prayer circles, etc.
 */
const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Group category/tags
    category: {
      type: String,
      trim: true,
      index: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    // Location information
    location: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    zipCode: {
      type: String,
      trim: true,
    },
    // Optional: coordinates for map
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    // Group image/avatar
    avatar: {
      url: { type: String },
      thumbnailUrl: { type: String },
      fileId: { type: String },
    },
    // Member count (can be updated manually or calculated)
    members: {
      type: Number,
      default: 0,
    },
    // Group leader/organizer
    leader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Meeting schedule
    meetingSchedule: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'as-needed'],
      },
      dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      },
      time: {
        type: String, // e.g., "7:00 PM"
      },
      notes: {
        type: String,
      },
    },
    // Contact information
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    // Group settings
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresApproval: {
      type: Boolean,
      default: false,
    },
    maxMembers: {
      type: Number,
      default: null, // null = unlimited
    },
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'archived'],
      default: 'active',
      index: true,
    },
    // Created by (user who created the group)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
groupSchema.index({ name: 1, status: 1 });
groupSchema.index({ category: 1, status: 1 });
groupSchema.index({ city: 1, state: 1, status: 1 });
groupSchema.index({ status: 1 });

export default mongoose.model("Group", groupSchema);

