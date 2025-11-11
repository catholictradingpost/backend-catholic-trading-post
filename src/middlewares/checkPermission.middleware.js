import Permission from "../models/permission.model.js";
import Module from "../models/module.model.js";

export const checkPermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user; // Already populated from verifyToken
      if (!user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const roles = user.roles; // Array of user roles
      if (!roles || roles.length === 0) {
        return res.status(403).json({ message: "No roles assigned to user" });
      }

      // Find the module
      const moduleFound = await Module.findOne({ name: moduleName });
      if (!moduleFound) {
        return res.status(404).json({ message: `Module '${moduleName}' not found` });
      }

      // Check if any of the user's roles has permission for the module
      const permission = await Permission.findOne({
        role: { $in: roles.map(role => role._id) },
        module: moduleFound._id
      });

      if (!permission) {
        return res.status(403).json({ message: `No permission for module '${moduleName}'` });
      }

      // Now verify the requested action
      if (!permission.actions[action]) {
        return res.status(403).json({ message: `No '${action}' permission for module '${moduleName}'` });
      }

      next();
    } catch (error) {
      console.error("Permission checking error:", error);
      return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
  };
};
