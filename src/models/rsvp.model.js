import mongoose from "mongoose";

/**
 * RSVP Model
 * Tracks user RSVPs for events
 */
const rsvpSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // RSVP status
    status: {
      type: String,
      enum: ['attending', 'not_attending', 'maybe'],
      default: 'attending',
      required: true,
    },
    // Number of guests (if allowed)
    guests: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Optional notes from user
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    // RSVP timestamp
    rsvpAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one RSVP per user per event
rsvpSchema.index({ event: 1, user: 1 }, { unique: true });

// Index for counting attendees
rsvpSchema.index({ event: 1, status: 1 });

export default mongoose.model("RSVP", rsvpSchema);

