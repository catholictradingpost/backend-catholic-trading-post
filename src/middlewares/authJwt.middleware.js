import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";
import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import Verification from "../models/verification.model.js";

// Middleware to verify JWT token and validate user access
export const verifyToken = async (req, res, next) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing or in incorrect format" });
  }

  const token = bearer.split(" ")[1];

  try {
    const decoded = jwt.verify(token, TOKEN_SECRET);

    const userFound = await User.findById(decoded.id).populate('roles');
    if (!userFound) {
      return res.status(401).json({ message: "User not found" });
    }

    const dbToken = await Token.findOne({ userId: userFound._id });
    if (!dbToken || dbToken.token !== token) {
      return res.status(401).json({ message: "Token is no longer valid. Please login again." });
    }

    // Find the user's verification
    const userVerification = await Verification.findOne({ user: userFound._id });

    if (userVerification && userVerification.status === "denied") {
      const deniedDate = new Date(userVerification.updatedAt);
      const now = new Date();
      const daysSinceDenied = Math.floor((now - deniedDate) / (1000 * 60 * 60 * 24)); // Calculate days difference
      const remainingDays = 7 - daysSinceDenied;

      if (remainingDays <= 0) {
        return res.status(401).json({
          message: "Your verification was denied and the 7-day correction period has expired. Please contact support."
        });
      } else {
        return res.status(401).json({
          message: `Your verification was denied. You have ${remainingDays} day(s) left to correct your information.`
        });
      }
    }

    req.user = userFound;
    req.userId = userFound._id.toString();

    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized", error: error.message });
  }
};

// Endpoint to extend session and generate new JWT
export const extendSession = async (req, res) => {
  try {
    const { id } = req.user; // The verifyToken middleware already validated the token

    const newToken = jwt.sign({ id }, TOKEN_SECRET, {
      expiresIn: '24h',
    });

    const userFound = await User.findById(id);
    if (!userFound) {
      return res.status(401).json({ message: "User not found" });
    }

    const newExpirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    return res.json({
      id: userFound._id,
      roles: userFound.roles,
      name: userFound.name,
      token: newToken,
      expirationTime: newExpirationTime
    });
  } catch (error) {
    return res.status(500).json({ message: "Error extending session", error });
  }
};
