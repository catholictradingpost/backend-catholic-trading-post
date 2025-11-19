import { Router } from "express";
import {
  login,
  logout,
  register,
  registerAdmin,
  changePasswordHandler,
  verify,
  verifyEmail,
  verifyEmailCode,
  resendPendingVerificationCode,
  resendVerificationEmail
} from "../controllers/auth.controller.js";

import {
  checkExistingRole,
  checkExistingUser,
} from "../middlewares/verifySignup.middleware.js";

import {
  verifyToken,
  optionalVerifyToken,
  extendSession
} from "../middlewares/authJwt.middleware.js";
import { validateRegistration, validateLogin } from "../middlewares/inputValidation.middleware.js";

const router = Router();

// Route to register a user
router.post("/signup", validateRegistration, checkExistingUser, register);  // POST to register a user

// Route to register an admin (for admin panel)
router.post("/signup/admin", validateRegistration, checkExistingUser, registerAdmin);  // POST to register an admin user

// Route to login
router.post("/signin", validateLogin, login);  // POST to login

// Route to logout (uses optional token verification - allows logout even with expired token)
router.post("/logout", optionalVerifyToken, logout);  // POST to logout

// Route to verify the token
router.get("/verify", verify, async (req, res) => {  // GET to verify the token
  // Populate roles before sending response
  const userWithRoles = await req.user.populate("roles", "_id name");
  res.json({ 
    message: "Token is valid", 
    user: {
      ...userWithRoles.toObject(),
      roles: userWithRoles.roles.map(role => ({
        _id: role._id,
        name: role.name,
      })),
    }
  });
});

// Route to extend the session (middleware to ensure token is valid)
router.get("/extend-session", verifyToken, extendSession);  // GET to extend the session

// Route to change the password
router.post("/change-password", verifyToken, changePasswordHandler);  // POST to change password

// Route to verify email (token-based - for backward compatibility)
router.get("/verify-email", verifyEmail);  // GET to verify email with token

// Route to verify email with code
router.post("/verify-email-code", verifyEmailCode);  // POST to verify email with code

// Route to resend verification code for pending registration (no auth required)
router.post("/resend-pending-verification", resendPendingVerificationCode);  // POST to resend code for pending registration

// Route to resend verification email (for existing users)
router.post("/resend-verification", verifyToken, resendVerificationEmail);  // POST to resend verification email

export default router;