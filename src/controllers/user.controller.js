import User from "../models/user.model.js";
import Role from "../models/role.model.js";

// Get all users
export const getUsers = async (req, res) => {
  try {
    // Populate the roles field with the name of each role
    const users = await User.find().populate("roles", "name"); // Populate roles (many-to-many)
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error: error.message });
  }
};

// Get a user by ID
export const getUserById = async (req, res) => {
  try {
    // Populate the roles field with the name of each role
    const user = await User.findById(req.params.id).populate("roles", "name"); // Populate roles (many-to-many)
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user", error: error.message });
  }
};

// Update a user by ID
export const updateUser = async (req, res) => {
  try {
    const { first_name, last_name, phone, email, roles } = req.body;

    let rolesData;
    if (roles && roles.length > 0) {
      // Find roles by their names
      rolesData = await Role.find({ name: { $in: roles } });
      if (rolesData.length === 0) {
        return res.status(400).json({ message: "Invalid roles provided." });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        first_name,
        last_name,
        phone,
        email,
        roles: rolesData ? rolesData.map(role => role._id) : undefined, // Update roles if provided
      },
      { new: true }
    ).populate("roles", "name"); // Populate roles (many-to-many)

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: "Error updating user", error: error.message });
  }
};

// Delete a user by ID
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error: error.message });
  }
};
