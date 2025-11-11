import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Plan names should be unique
      trim: true
    },
    description: {
      type: String
    },
    price: {
      type: Number,
      required: true,
      min: 0 // Price must be a positive number
    },
    durationInDays: {
      type: Number,
      required: true,
      min: 1 // Duration must be at least 1 day
    },
    benefits: {
      type: [String], // List of benefits included in the plan
      default: []
    },
    postCredits: {
      type: Number,
      default: 0,
      min: 0,
    },
    unlimitedPosts: {
      type: Boolean,
      default: false,
    },
    creditCostPerPost: {
      type: Number,
      default: 1,
      min: 1,
    },
    stripePriceId: {
      type: String, // Stripe Price ID for subscription plans (sub_1m, sub_3m, sub_6m)
      default: '',
      trim: true
    },
  },
  {
    timestamps: true // Automatically create createdAt and updatedAt fields
  }
);

export default mongoose.model('Plan', planSchema);
