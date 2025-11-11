import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired'],
      default: 'active'
    },
    paymentReference: {
      type: String, // Reference from the payment gateway
      default: ''
    },
    memo: {
      type: String, // Optional memo/note field for Zelle payment reference or admin notes
      default: ''
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
    stripeSubscriptionId: {
      type: String, // Stripe Subscription ID
      default: '',
      trim: true
    },
    stripeCustomerId: {
      type: String, // Stripe Customer ID
      default: '',
      trim: true
    },
    stripePaymentIntentId: {
      type: String, // Stripe Payment Intent ID for one-time payments
      default: '',
      trim: true
    },
  },
  {
    timestamps: true // Automatically handle createdAt and updatedAt fields
  }
);

// Ensure a user can only have one active subscription at a time
subscriptionSchema.index({ user: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });

export default mongoose.model('Subscription', subscriptionSchema);
