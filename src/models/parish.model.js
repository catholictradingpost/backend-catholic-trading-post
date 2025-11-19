import mongoose from "mongoose";

/**
 * Parish Model for Catholic Trading Post
 * Tracks parish information including location, contact details, and mass times
 */
const parishSchema = new mongoose.Schema(
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
    // Location information
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
      index: true,
    },
    state: {
      type: String,
      trim: true,
      index: true,
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
    // Contact information
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    // Parish leadership
    pastor: {
      type: String,
      trim: true,
    },
    // Mass times - stored as array of strings for flexibility
    massTimes: [{
      type: String,
      trim: true,
    }],
    // Parish image/logo
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
    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'active',
      index: true,
    },
    // Created by (admin user who added the parish)
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
parishSchema.index({ name: 1, status: 1 });
parishSchema.index({ city: 1, state: 1, status: 1 });
parishSchema.index({ status: 1 });

export default mongoose.model("Parish", parishSchema);

