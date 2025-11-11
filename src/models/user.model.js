import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
    },
    first_name: {
      type: String,
    },
    last_name: {
      type: String,
    },
    phone: {
      type: String,
    },
    roles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role", 
        required: true,
      },
    ],
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationTokenExpiry: {
      type: Date,
      default: null,
    },
    postCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    freeUser: {
      type: Boolean,
      default: true,
    },
    // Account status
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
      index: true,
    },
    // Ban/suspension details
    banInfo: {
      bannedAt: { type: Date, default: null },
      bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      banReason: { type: String, trim: true },
      banExpiresAt: { type: Date, default: null }, // null = permanent ban
    },
    // Password reset token
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);
