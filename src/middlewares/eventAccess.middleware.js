import User from "../models/user.model.js";
import Questionnaire from "../models/questionnaire.model.js";
import Verification from "../models/verification.model.js";

/**
 * Middleware to check if user has access to events
 * Based on verified Catholic status and event access settings
 */
export const checkEventAccess = async (req, res, next) => {
  try {
    const userId = req.userId;
    const { eventId } = req.params;
    const { allowNonCatholics } = req.body; // For event creation

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user is verified Catholic
    const questionnaire = await Questionnaire.findOne({ user: userId });
    const verification = await Verification.findOne({ user: userId });

    const isVerifiedCatholic = 
      (questionnaire && questionnaire.status === 'verified') ||
      (verification && verification.status === 'approved');

    // For event listing/creation, check if user is verified Catholic
    // Access to specific events is checked in the controller
    if (!eventId) {
      // For event creation/listing, check if user is verified Catholic
      // or if the event allows non-Catholics (for listing, we allow viewing)
      // Access control is enforced per-event in the controller
    }

    // Attach verification status to request
    req.isVerifiedCatholic = isVerifiedCatholic;
    req.userVerificationStatus = {
      questionnaire: questionnaire?.status || null,
      verification: verification?.status || null,
      isVerified: isVerifiedCatholic,
    };

    next();
  } catch (error) {
    console.error("Error checking event access:", error);
    res.status(500).json({ message: "Error checking access", error: error.message });
  }
};

/**
 * Middleware to check if user can create/manage events (admin only)
 */
export const checkEventAdminAccess = async (req, res, next) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate("roles");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has admin role
    const roleNames = user.roles.map(role => role.name || role);
    const isAdmin = roleNames.some(role => 
      role === "Admin" || 
      role === "Super Usuario" || 
      role === "Super User" ||
      role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({
        message: "Admin access required to manage events.",
      });
    }

    next();
  } catch (error) {
    console.error("Error checking admin access:", error);
    res.status(500).json({ message: "Error checking admin access", error: error.message });
  }
};

export default {
  checkEventAccess,
  checkEventAdminAccess,
};

