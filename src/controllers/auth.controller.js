import User from "../models/user.model.js";
import Role from "../models/role.model.js";
import Token from "../models/token.model.js";
import PendingRegistration from "../models/pendingRegistration.model.js";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";
import Questionnaire from "../models/questionnaire.model.js";
import crypto from "crypto";
// Try free email service first, fallback to SendGrid
import { sendVerificationEmail } from "../libs/emailServiceFree.js";

export const register = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists in User collection
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "The email is already in use" });
    }

    // Check if there's a pending registration for this email
    const existingPending = await PendingRegistration.findOne({ email: normalizedEmail });
    if (existingPending) {
      // Delete old pending registration and create a new one
      await PendingRegistration.findOneAndDelete({ email: normalizedEmail });
    }

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Always assign the "Default" role
    const defaultRole = await Role.findOne({ name: "Default" });
    if (!defaultRole) {
      return res.status(500).json({ message: 'Default "Default" role not found' });
    }

    // Generate 6-digit verification code
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailVerificationCodeExpiry = new Date();
    emailVerificationCodeExpiry.setMinutes(emailVerificationCodeExpiry.getMinutes() + 15); // 15 minutes expiry

    // Store registration data in PendingRegistration (account not created yet)
    const pendingRegistration = new PendingRegistration({
      email: normalizedEmail,
      password: passwordHash,
      first_name,
      last_name,
      phone,
      emailVerificationCode,
      emailVerificationCodeExpiry,
      roleId: defaultRole._id,
    });

    await pendingRegistration.save();

    // Send verification email with code
    const emailSent = await sendVerificationEmail(normalizedEmail, emailVerificationCode, first_name);
    
    // Log if email sending failed (for debugging)
    if (!emailSent) {
      console.error(`⚠️ Verification email NOT sent to ${normalizedEmail}. Check SendGrid configuration.`);
      console.error(`Verification code for manual use: ${emailVerificationCode}`);
      // Still return success to user, but log the issue
      // In production, you might want to return an error or queue the email
    } else {
      console.log(`✅ Verification code ${emailVerificationCode} sent to ${normalizedEmail}`);
    }

    // Response - don't create user account or token yet
    const response = {
      email: normalizedEmail,
      message: emailSent 
        ? "Registration initiated. Please check your email for the verification code to complete your registration."
        : "Registration initiated. Email sending failed - please check the console for the verification code.",
    };

    // Include the code if email sending failed (for development/testing)
    if (!emailSent) {
      response.verificationCode = emailVerificationCode;
      response.debug = "Email sending failed (SendGrid credits exceeded or not configured). Use this code to verify your account.";
      console.log(`\n${'='.repeat(60)}`);
      console.log(`⚠️  EMAIL NOT SENT - VERIFICATION CODE FOR ${normalizedEmail}:`);
      console.log(`   CODE: ${emailVerificationCode}`);
      console.log(`   Expires in: 15 minutes`);
      console.log(`${'='.repeat(60)}\n`);
    }

    res.status(201).json(response);    
  } catch (error) {
    res.status(500).json({ message: "Error registering user", error: error.message });
  }
};

// Admin registration - assigns Admin role instead of Default
export const registerAdmin = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "The email is already in use" });
    }

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Assign "Admin" role for admin panel registrations
    const adminRole = await Role.findOne({ name: "Admin" });
    if (!adminRole) {
      return res.status(500).json({ message: 'Admin role not found' });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24); // 24 hours expiry

    // Create user with Admin role
    const newUser = new User({
      email,
      password: passwordHash,
      first_name,
      last_name,
      phone,
      roles: [adminRole._id], // Assign Admin role
      emailVerified: true, // Auto-verify admin accounts
      emailVerificationToken,
      emailVerificationTokenExpiry,
    });

    const savedUser = await newUser.save();

    // Populate roles to include both _id and name
    const populatedUser = await savedUser.populate("roles", "_id name");

    // Create token
    const token = await createAccessToken({
      _id: populatedUser._id,
      first_name: populatedUser.first_name,
      last_name: populatedUser.last_name,
      email: populatedUser.email,
      roles: populatedUser.roles.map(role => role.name),
    });

    await Token.findOneAndUpdate(
      { userId: populatedUser._id },
      { token },
      { upsert: true, new: true }
    );

    // Response
    res.status(201).json({
      user: {
        _id: populatedUser._id,
        email: populatedUser.email,
        first_name: populatedUser.first_name,
        last_name: populatedUser.last_name,
        phone: populatedUser.phone,
        roles: populatedUser.roles.map(role => ({
          _id: role._id,
          name: role.name,
        })),
        emailVerified: populatedUser.emailVerified,
        questionnaire: false
      },
      token,
      message: "Admin account created successfully.",
    });    
  } catch (error) {
    res.status(500).json({ message: "Error registering admin user", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await User.findOne({ email });

    if (!userFound) {
      return res.status(400).json({ message: ["Email does not exist."] });
    }

    const isMatch = await bcrypt.compare(password, userFound.password);
    if (!isMatch) {
      return res.status(400).json({ message: ["The password is incorrect."] });
    }

    // Populate roles before creating token
    const populatedUser = await userFound.populate("roles", "_id name");

    const token = await createAccessToken({
      _id: populatedUser._id,
      first_name: populatedUser.first_name,
      last_name: populatedUser.last_name,
      email: populatedUser.email,
    });

    await Token.findOneAndUpdate(
      { userId: populatedUser._id },
      { token },
      { upsert: true, new: true }
    );

    // Verificar si el usuario ya tiene un cuestionario
    const hasQuestionnaire = await Questionnaire.exists({ user: populatedUser._id });

    return res.json({
      user: {
        _id: populatedUser._id,
        email: populatedUser.email,
        first_name: populatedUser.first_name,
        last_name: populatedUser.last_name,
        phone: populatedUser.phone,
        emailVerified: populatedUser.emailVerified,
        questionnaire: !!hasQuestionnaire, // true o false
        roles: populatedUser.roles.map(role => ({
          _id: role._id,
          name: role.name,
        })),
      },
      token,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // If user is authenticated (token was valid), clear the token from database
    if (req.user && req.user._id) {
      const userId = req.user._id;
      // Remove the token associated with the user
      await Token.findOneAndDelete({ userId });
    } else {
      // Token was invalid/expired, but we still want to allow logout
      // Try to find and remove token from the authorization header if present
      const bearer = req.headers.authorization;
      if (bearer && bearer.startsWith("Bearer ")) {
        const token = bearer.split(" ")[1];
        // Try to find token in database and remove it
        await Token.findOneAndDelete({ token });
      }
    }

    res.clearCookie("token"); // Optional if using cookies
    return res.sendStatus(200);
  } catch (error) {
    // Even if there's an error, return success since we're logging out
    // The frontend will clear local storage anyway
    return res.sendStatus(200);
  }
};

export const verify = async (req, res, next) => {
  const token = req.headers.authorization;

  // Check whether a token was provided in the authorization header
  if (!token || !token.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or incorrectly formatted authorization token" });
  }

  // Extract the token from the "Bearer [token]" format
  const tokenValue = token.split(" ")[1];

  try {
    // Verify token and get payload (includes user id)
    const decoded = jwt.verify(tokenValue, TOKEN_SECRET);

    // Find the user in the database and populate roles
    const userFound = await User.findById(decoded.id).populate("roles", "_id name");
    if (!userFound) {
      return res.status(401).json({ message: "User not found" });
    }

    // Assign the user to req.user so it is available in the following routes
    req.user = userFound;
    return next(); // Pass control to the next middleware
  } catch (error) {
    return res.status(401).json({ message: "You are not authorized to perform this action. Please log in again." });
  }
};

export const changePasswordHandler = async (req, res) => {
  try {
    const { id, oldPassword, newPassword } = req.body;

    // Find the user by their ID
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Validate the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "The old password is incorrect." });
    }

    // Encrypt the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    user.password = hashedPassword;
    await user.save();

    // Generate a new token
    const token = jwt.sign({ id: user._id }, TOKEN_SECRET, {
      expiresIn: 86400, // 24 hours
    });

    res.json({ message: "Password successfully updated.", token });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "Error changing password." });
  }
};

// Verify email endpoint (token-based - for backward compatibility)
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    // Find user with this verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpiry: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired verification token." });
    }

    // Verify the email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiry = null;
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpiry = null;
    await user.save();

    res.status(200).json({ message: "Email verified successfully. You can now use all features." });
  } catch (error) {
    console.error("Error verifying email:", error);
    res.status(500).json({ message: "Error verifying email.", error: error.message });
  }
};

// Verify email with code endpoint - creates account only after successful verification
export const verifyEmailCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required." });
    }

    // Find pending registration with this email and verification code
    const pendingRegistration = await PendingRegistration.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationCode: code,
      emailVerificationCodeExpiry: { $gt: new Date() }, // Code not expired
    });

    if (!pendingRegistration) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    // Check if email already exists in User collection (shouldn't happen, but safety check)
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      // Delete pending registration and return error
      await PendingRegistration.findOneAndDelete({ email: email.toLowerCase().trim() });
      return res.status(400).json({ message: "Email is already registered. Please log in instead." });
    }

    // Create the user account now that verification is successful
    const newUser = new User({
      email: pendingRegistration.email,
      password: pendingRegistration.password,
      first_name: pendingRegistration.first_name,
      last_name: pendingRegistration.last_name,
      phone: pendingRegistration.phone,
      roles: [pendingRegistration.roleId],
      emailVerified: true, // Mark as verified since we verified the code
    });

    const savedUser = await newUser.save();

    // Delete the pending registration
    await PendingRegistration.findOneAndDelete({ email: email.toLowerCase().trim() });

    // Populate roles
    const populatedUser = await savedUser.populate("roles", "_id name");

    // Create access token
    const token = await createAccessToken({
      _id: populatedUser._id,
      first_name: populatedUser.first_name,
      last_name: populatedUser.last_name,
      email: populatedUser.email,
      roles: populatedUser.roles.map(role => role.name),
    });

    await Token.findOneAndUpdate(
      { userId: populatedUser._id },
      { token },
      { upsert: true, new: true }
    );

    // Check if user has questionnaire
    const hasQuestionnaire = await Questionnaire.exists({ user: populatedUser._id });

    res.status(200).json({
      message: "Email verified successfully. Your account has been created.",
      user: {
        _id: populatedUser._id,
        email: populatedUser.email,
        first_name: populatedUser.first_name,
        last_name: populatedUser.last_name,
        phone: populatedUser.phone,
        roles: populatedUser.roles.map(role => ({
          _id: role._id,
          name: role.name,
        })),
        emailVerified: populatedUser.emailVerified,
        questionnaire: !!hasQuestionnaire,
      },
      token,
    });
  } catch (error) {
    console.error("Error verifying email code:", error);
    res.status(500).json({ message: "Error verifying email code.", error: error.message });
  }
};

// Resend verification code for pending registration (no auth required)
export const resendPendingVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    // Find pending registration
    const pendingRegistration = await PendingRegistration.findOne({ 
      email: email.toLowerCase().trim() 
    });

    if (!pendingRegistration) {
      return res.status(404).json({ 
        message: "No pending registration found for this email. Please register again." 
      });
    }

    // Generate new verification code
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailVerificationCodeExpiry = new Date();
    emailVerificationCodeExpiry.setMinutes(emailVerificationCodeExpiry.getMinutes() + 15); // 15 minutes expiry

    // Update pending registration with new code
    pendingRegistration.emailVerificationCode = emailVerificationCode;
    pendingRegistration.emailVerificationCodeExpiry = emailVerificationCodeExpiry;
    await pendingRegistration.save();

    // Send verification email with new code
    const emailSent = await sendVerificationEmail(
      pendingRegistration.email, 
      emailVerificationCode, 
      pendingRegistration.first_name
    );
    
    if (!emailSent) {
      console.warn(`⚠️ Verification email NOT sent to ${pendingRegistration.email}. Check email service configuration.`);
      return res.status(500).json({ 
        message: "Failed to send verification email. Please check email service configuration (Resend/Gmail/SendGrid).",
        code: emailVerificationCode, // Include code for manual verification (development only)
      });
    }

    res.status(200).json({ message: "Verification code sent. Please check your inbox." });
  } catch (error) {
    console.error("Error resending pending verification code:", error);
    res.status(500).json({ message: "Error resending verification code.", error: error.message });
  }
};

// Resend verification email (for existing users)
export const resendVerificationEmail = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified." });
    }

    // Generate new verification token (for backward compatibility)
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpiry = new Date();
    emailVerificationTokenExpiry.setHours(emailVerificationTokenExpiry.getHours() + 24);

    // Generate new 6-digit verification code
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const emailVerificationCodeExpiry = new Date();
    emailVerificationCodeExpiry.setMinutes(emailVerificationCodeExpiry.getMinutes() + 15); // 15 minutes expiry

    user.emailVerificationToken = emailVerificationToken;
    user.emailVerificationTokenExpiry = emailVerificationTokenExpiry;
    user.emailVerificationCode = emailVerificationCode;
    user.emailVerificationCodeExpiry = emailVerificationCodeExpiry;
    await user.save();

    // Send verification email with code
    const emailSent = await sendVerificationEmail(user.email, emailVerificationCode, user.first_name);
    
    if (!emailSent) {
      console.warn(`⚠️ Verification email NOT sent to ${user.email}. Check SendGrid configuration.`);
      return res.status(500).json({ 
        message: "Failed to send verification email. Please check SendGrid configuration or contact support.",
        token: emailVerificationToken, // Include token for manual verification (development only)
        manualVerificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
      });
    }

    res.status(200).json({ message: "Verification email sent. Please check your inbox." });
  } catch (error) {
    console.error("Error resending verification email:", error);
    res.status(500).json({ message: "Error resending verification email.", error: error.message });
  }
};
