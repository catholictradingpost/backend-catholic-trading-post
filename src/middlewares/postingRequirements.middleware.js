import Config from "../models/config.model.js";
import Questionnaire from "../models/questionnaire.model.js";
import Verification from "../models/verification.model.js";
import User from "../models/user.model.js";

export const checkPostingRequirements = async (req, res, next) => {
  try {
    const config = await Config.getConfig();
    const user = req.user;

    // If posting doesn't require account, skip checks
    if (!config.requireAccountForPosting) {
      return next();
    }

    // Check email verification requirement
    if (config.requireEmailVerification) {
      const userDoc = await User.findById(user._id);
      if (!userDoc || !userDoc.emailVerified) {
        return res.status(403).json({
          message: "Email verification required. Please verify your email to create posts.",
        });
      }
    }

    // Check questionnaire verification requirement
    if (config.requireQuestionnaireVerification) {
      const questionnaire = await Questionnaire.findOne({ user: user._id });
      if (!questionnaire) {
        return res.status(403).json({
          message: "Questionnaire required. Please complete your onboarding questionnaire to create posts.",
        });
      }

      if (questionnaire.status !== 'verified') {
        const statusMessages = {
          pending: "Your questionnaire is pending review. Please wait for admin approval to create posts.",
          rejected: "Your questionnaire was rejected. Please update your information and resubmit.",
        };
        return res.status(403).json({
          message: statusMessages[questionnaire.status] || "Questionnaire verification required.",
          status: questionnaire.status,
          observation: questionnaire.observation || null,
        });
      }
    }

    // Check verification approval requirement
    if (config.requireVerificationApproval) {
      const verification = await Verification.findOne({ user: user._id });
      if (!verification) {
        return res.status(403).json({
          message: "Account verification required. Please submit your verification information to create posts.",
        });
      }

      if (verification.status !== 'approved') {
        const statusMessages = {
          review: "Your verification is pending review. Please wait for admin approval to create posts.",
          denied: "Your verification was denied. Please update your information and resubmit.",
        };
        return res.status(403).json({
          message: statusMessages[verification.status] || "Verification approval required.",
          status: verification.status,
          observation: verification.observation || null,
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error checking posting requirements:", error);
    return res.status(500).json({
      message: "Error checking posting requirements.",
      error: error.message,
    });
  }
};

