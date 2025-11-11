import Config from "../models/config.model.js";

// Get configuration
export const getConfig = async (req, res) => {
  try {
    const user = req.user;
    const userRoles = user.roles.map(role => role.name);

    // Only admins can view config
    if (!userRoles.includes('Super User') && !userRoles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized to view configuration.' });
    }

    const config = await Config.getConfig();
    res.status(200).json({ config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error retrieving configuration', error: error.message });
  }
};

// Update configuration
export const updateConfig = async (req, res) => {
  try {
    const user = req.user;
    const userRoles = user.roles.map(role => role.name);

    // Only admins can update config
    if (!userRoles.includes('Super User') && !userRoles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized to update configuration.' });
    }

    const {
      requireAccountForPosting,
      requireEmailVerification,
      requireQuestionnaireVerification,
      requireVerificationApproval,
      allowMotorcycles,
      postingRequiresAccount,
      postingRequiresVerification,
      autoApproveListings,
      requireListingModeration,
      eventsRequireVerification,
      enableStripePayments,
      enableManualPayments,
    } = req.body;

    let config = await Config.findOne();
    if (!config) {
      config = await Config.create({});
    }

    if (requireAccountForPosting !== undefined) {
      config.requireAccountForPosting = requireAccountForPosting;
    }
    if (requireEmailVerification !== undefined) {
      config.requireEmailVerification = requireEmailVerification;
    }
    if (requireQuestionnaireVerification !== undefined) {
      config.requireQuestionnaireVerification = requireQuestionnaireVerification;
    }
    if (requireVerificationApproval !== undefined) {
      config.requireVerificationApproval = requireVerificationApproval;
    }
    if (allowMotorcycles !== undefined) {
      config.allowMotorcycles = allowMotorcycles;
    }
    if (postingRequiresAccount !== undefined) {
      config.postingRequiresAccount = postingRequiresAccount;
    }
    if (postingRequiresVerification !== undefined) {
      config.postingRequiresVerification = postingRequiresVerification;
    }
    if (autoApproveListings !== undefined) {
      config.autoApproveListings = autoApproveListings;
    }
    if (requireListingModeration !== undefined) {
      config.requireListingModeration = requireListingModeration;
    }
    if (eventsRequireVerification !== undefined) {
      config.eventsRequireVerification = eventsRequireVerification;
    }
    if (enableStripePayments !== undefined) {
      config.enableStripePayments = enableStripePayments;
    }
    if (enableManualPayments !== undefined) {
      config.enableManualPayments = enableManualPayments;
    }

    await config.save();

    res.status(200).json({
      message: 'Configuration updated successfully',
      config,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating configuration', error: error.message });
  }
};

