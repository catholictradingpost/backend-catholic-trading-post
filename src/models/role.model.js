import mongoose from "mongoose";

export const ROLES = ["Super User", "Admin", "User", "Default", "Moderator", "Member"];

const roleSchema = new mongoose.Schema(
  {
    name: String,
  },
  {
    versionKey: false,
  }
);

export default mongoose.model("Role", roleSchema);