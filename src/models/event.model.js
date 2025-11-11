import mongoose from "mongoose";

/**
 * Event Model for "Cars for Christ" Community
 * Tracks community events with RSVP functionality
 */
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    // Event date and time
    eventDate: {
      type: Date,
      required: true,
      index: true,
    },
    eventTime: {
      type: String, // e.g., "10:00 AM" or "9:00 AM - 5:00 PM"
      required: true,
    },
    // Venue information
    venue: {
      name: {
        type: String,
        required: true,
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
    },
    // Event host (user who created the event)
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Access control
    accessControl: {
      // Require verified Catholic members only
      verifiedCatholicsOnly: {
        type: Boolean,
        default: true,
      },
      // Toggle to allow respectful non-Catholics
      allowNonCatholics: {
        type: Boolean,
        default: false,
      },
    },
    // RSVP settings
    rsvp: {
      enabled: {
        type: Boolean,
        default: true,
      },
      required: {
        type: Boolean,
        default: false, // Optional RSVP by default
      },
      maxAttendees: {
        type: Number,
        default: null, // null = unlimited
      },
      deadline: {
        type: Date, // RSVP deadline before event
        default: null,
      },
    },
    // Event image/photo
    image: {
      url: { type: String },
      thumbnailUrl: { type: String },
      fileId: { type: String },
    },
    // Event status
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
      index: true,
    },
    // Event category/tags
    category: {
      type: String,
      trim: true,
      default: 'Community',
    },
    tags: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
eventSchema.index({ eventDate: 1, status: 1 });
eventSchema.index({ host: 1, status: 1 });
eventSchema.index({ 'venue.city': 1, 'venue.state': 1 });

export default mongoose.model("Event", eventSchema);

