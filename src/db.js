import mongoose from "mongoose";
import { MONGODB_URI } from "./config.js";

export const connectDB = async () => {
  const db = mongoose.connection;

  db.on("error", (err) => {
    console.error("MongoDB connection error:", err);
    if (err.message.includes("IP") || err.message.includes("whitelist")) {
      console.error("\n⚠️  IP WHITELIST ISSUE:");
      console.error("Your IP address is NOT whitelisted in MongoDB Atlas.");
      console.error("Go to: https://cloud.mongodb.com/ → Network Access");
      console.error("Add your IP address or use 0.0.0.0/0 for development");
    }
  });

  db.once("open", () => {
    console.log(`✅ MongoDB connected to database: ${db.name}`);
  });

  db.on("disconnected", () => {
    console.log("⚠️  MongoDB disconnected");
  });

  try {
    // For MongoDB Atlas, ensure connection string includes retryWrites and w=majority
    let connectionUri = MONGODB_URI;
    if (connectionUri.includes("mongodb+srv://") && !connectionUri.includes("retryWrites")) {
      // Add retryWrites if not present
      connectionUri += (connectionUri.includes("?") ? "&" : "?") + "retryWrites=true&w=majority";
    }

    await mongoose.connect(connectionUri, {
      // These options are deprecated in mongoose 7.x but kept for compatibility
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 1, // Maintain at least 1 socket connection
    });
  } catch (error) {
    console.error("MongoDB connection error:", error);
    
    // Provide helpful error messages
    if (error.message.includes("IP") || error.message.includes("whitelist")) {
      console.error("\n❌ IP WHITELIST ERROR:");
      console.error("Your IP address is NOT whitelisted in MongoDB Atlas.");
      console.error("\n📋 Steps to fix:");
      console.error("1. Go to: https://cloud.mongodb.com/");
      console.error("2. Select your project");
      console.error("3. Click 'Network Access' in the left sidebar");
      console.error("4. Click 'Add IP Address'");
      console.error("5. Add your current IP or use '0.0.0.0/0' for development");
      console.error("6. Wait 1-2 minutes, then restart your server");
    }
    
    if (error.message.includes("SSL") || error.message.includes("TLS")) {
      console.error("\n❌ SSL/TLS ERROR:");
      console.error("There's an SSL handshake issue. This often happens when:");
      console.error("- IP is not whitelisted (most common)");
      console.error("- Network firewall is blocking the connection");
      console.error("- VPN is interfering with the connection");
    }
    
    throw error; // Re-throw to prevent server from starting without DB
  }
};