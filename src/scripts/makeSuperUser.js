// Script to make a user Super User by email
import { config } from "dotenv";
config();

import mongoose from "mongoose";
import User from "../models/user.model.js";
import Role from "../models/role.model.js";

const MONGODB_URI = process.env.MONGODB_URI;

const makeSuperUser = async (email) => {
  try {
    if (!MONGODB_URI) {
      console.error("MONGODB_URI not found in environment variables");
      process.exit(1);
    }

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Found user: ${user.first_name} ${user.last_name} (${user.email})`);

    // Find the Super User role
    const superUserRole = await Role.findOne({ name: "Super User" });
    if (!superUserRole) {
      console.error("❌ Super User role not found");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update user's role to Super User
    user.roles = [superUserRole._id];
    await user.save();

    // Populate to verify
    const updatedUser = await User.findById(user._id).populate("roles", "name");
    console.log(`\n✅ Successfully updated ${email} to Super User`);
    console.log(`📋 User roles: ${updatedUser.roles.map(r => r.name).join(", ")}`);
    console.log(`\n🎉 User can now login to admin panel with Super User privileges!`);

    await mongoose.disconnect();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.error("❌ Please provide an email address");
  console.log("Usage: node -r dotenv/config src/scripts/makeSuperUser.js <email>");
  process.exit(1);
}

makeSuperUser(email);

