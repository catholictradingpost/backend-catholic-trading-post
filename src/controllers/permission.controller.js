import Permission from "../models/permission.model.js";

// Get all permissions
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find()
      .populate('role', 'name')
      .populate('module', 'name')
      .exec();

    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching permissions", error: error.message });
  }
};

// Update permission (only actions)
export const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { actions } = req.body;

    const permission = await Permission.findById(id);

    if (!permission) {
      return res.status(404).json({ message: "Permission not found" });
    }

    permission.actions = actions;
    await permission.save();

    res.status(200).json({ message: "Permission updated successfully", permission });
  } catch (error) {
    res.status(500).json({ message: "Error updating permission", error: error.message });
  }
};
