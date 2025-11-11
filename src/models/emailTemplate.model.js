import mongoose from "mongoose";

/**
 * Email Template Model
 * Stores reusable email templates for SendGrid
 */
const emailTemplateSchema = new mongoose.Schema(
  {
    // Template identifier (e.g., 'verify_email', 'approval', 'denial', etc.)
    templateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    // Template name
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // Template description
    description: {
      type: String,
      trim: true,
    },
    // Subject line (can include variables like {{firstName}})
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    // HTML content (can include variables)
    htmlContent: {
      type: String,
      required: true,
    },
    // Plain text version (optional)
    textContent: {
      type: String,
      trim: true,
    },
    // Template variables (for documentation)
    variables: [
      {
        name: { type: String, required: true },
        description: { type: String },
        required: { type: Boolean, default: false },
      },
    ],
    // Template category
    category: {
      type: String,
      enum: [
        "verification",
        "notification",
        "transactional",
        "marketing",
        "system",
      ],
      default: "transactional",
    },
    // Active status
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Last modified by
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
emailTemplateSchema.index({ templateId: 1, active: 1 });
emailTemplateSchema.index({ category: 1, active: 1 });

export default mongoose.model("EmailTemplate", emailTemplateSchema);

