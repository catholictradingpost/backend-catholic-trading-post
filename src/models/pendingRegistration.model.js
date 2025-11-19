import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    first_name: {
      type: String,
      required: true,
    },
    last_name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    emailVerificationCode: {
      type: String,
      required: true,
    },
    emailVerificationCodeExpiry: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // Auto-delete expired documents
    },
    // Store role ID for when account is created
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
pendingRegistrationSchema.index({ email: 1 });
pendingRegistrationSchema.index({ emailVerificationCode: 1 });

export default mongoose.model("PendingRegistration", pendingRegistrationSchema);

