import { Router } from "express";
import {
  login,
  logout,
  register,
  registerAdmin,
  changePasswordHandler,
  verify,
  verifyEmail,
  resendVerificationEmail
} from "../controllers/auth.controller.js";

import {
  checkExistingRole,
  checkExistingUser,
} from "../middlewares/verifySignup.middleware.js";

import {
  verifyToken,
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

// Route to logout
router.post("/logout", verifyToken, logout);  // POST to logout

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

// Route to verify email
router.get("/verify-email", verifyEmail);  // GET to verify email with token

// Route to resend verification email
router.post("/resend-verification", verifyToken, resendVerificationEmail);  // POST to resend verification email

export default router;