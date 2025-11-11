import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    name: String,
    file_type: String, // "image", "audio", "video", "application", etc.
  },
  { _id: false } // No necesitas ID propio para cada attachment
);

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      enum: ['personal', 'community'],
      default: 'personal',
    },
    author_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attachments: [attachmentSchema], // Archivos subidos por ImageKit u otro
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Post", postSchema);
