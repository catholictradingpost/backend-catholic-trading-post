import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    requireAccountForPosting: {
      type: Boolean,
      default: true,
    },
    requireEmailVerification: {
      type: Boolean,
      default: true,
    },
    requireQuestionnaireVerification: {
      type: Boolean,
      default: true,
    },
    requireVerificationApproval: {
      type: Boolean,
      default: false,
    },
    // Category toggles
    allowMotorcycles: {
      type: Boolean,
      default: false,
    },
    // Posting requirements
    postingRequiresAccount: {
      type: Boolean,
      default: true,
    },
    postingRequiresVerification: {
      type: Boolean,
      default: false,
    },
    // Marketplace settings
    autoApproveListings: {
      type: Boolean,
      default: false,
    },
    requireListingModeration: {
      type: Boolean,
      default: true,
    },
    // Event settings
    eventsRequireVerification: {
      type: Boolean,
      default: true,
    },
    // Payment settings
    enableStripePayments: {
      type: Boolean,
      default: false,
    },
    enableManualPayments: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one config document exists
configSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

export default mongoose.model("Config", configSchema);

