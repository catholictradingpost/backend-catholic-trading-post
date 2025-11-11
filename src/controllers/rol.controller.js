import Role from "../models/role.model.js";

// Get all roles
export const getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving roles", error: error.message });
  }
};

// Get a role by ID
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving role", error: error.message });
  }
};

// Create a new role
export const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate required field
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existingRole = await Role.findOne({ name: name.trim() });
    if (existingRole) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const newRole = new Role({ name: name.trim(), description });
    await newRole.save();

    res.status(201).json({ message: "Role created successfully", role: newRole });
  } catch (error) {
    res.status(500).json({ message: "Error creating role", error: error.message });
  }
};

// Update a role by ID
export const updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Role name is required" });
    }

    const existingRole = await Role.findOne({ name: name.trim() });
    if (existingRole && existingRole._id.toString() !== req.params.id) {
      return res.status(400).json({ message: "Another role with that name already exists" });
    }

    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description },
      { new: true, runValidators: true }
    );

    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({ message: "Role updated successfully", role: updatedRole });
  } catch (error) {
    res.status(500).json({ message: "Error updating role", error: error.message });
  }
};

// Delete a role by ID
export const deleteRole = async (req, res) => {
  try {
    const deletedRole = await Role.findByIdAndDelete(req.params.id);

    if (!deletedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting role", error: error.message });
  }
};
