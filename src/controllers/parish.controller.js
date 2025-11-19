import Parish from "../models/parish.model.js";
import User from "../models/user.model.js";

/**
 * Get all parishes (with filters)
 * GET /api/parishes
 */
export const getParishes = async (req, res) => {
  try {
    const {
      status = "active", // active, inactive, pending, all
      city,
      state,
      search, // Text search in name, address, pastor
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Status filter
    if (status !== "all") {
      filter.status = status;
    }

    // Location filters
    if (city) {
      filter.city = new RegExp(city, "i");
    }
    if (state) {
      filter.state = new RegExp(state, "i");
    }

    // Text search (name, address, pastor)
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { address: new RegExp(search, "i") },
        { pastor: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { state: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, parishes] = await Promise.all([
      Parish.countDocuments(filter),
      Parish.find(filter)
        .populate("createdBy", "first_name last_name")
        .sort({ name: 1 }) // Sort by name ascending
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      parishes,
    });
  } catch (error) {
    console.error("Error getting parishes:", error);
    res.status(500).json({ message: "Error getting parishes", error: error.message });
  }
};

/**
 * Get single parish by ID
 * GET /api/parishes/:id
 */
export const getParishById = async (req, res) => {
  try {
    const { id } = req.params;

    const parish = await Parish.findById(id).populate(
      "createdBy",
      "first_name last_name email"
    );

    if (!parish) {
      return res.status(404).json({ message: "Parish not found" });
    }

    // Check status - only show active parishes to non-admins
    if (parish.status !== "active") {
      const userId = req.userId;
      if (userId) {
        const user = await User.findById(userId).populate("roles");
        const roleNames = user.roles.map((role) => role.name || role);
        const isAdmin = roleNames.some(
          (role) =>
            role === "Admin" ||
            role === "Super Usuario" ||
            role.toLowerCase().includes("admin")
        );

        if (!isAdmin) {
          return res.status(403).json({ message: "Parish not found or not accessible" });
        }
      } else {
        return res.status(403).json({ message: "Parish not found or not accessible" });
      }
    }

    res.status(200).json({ parish });
  } catch (error) {
    console.error("Error getting parish:", error);
    res.status(500).json({ message: "Error getting parish", error: error.message });
  }
};

/**
 * Create new parish (admin only)
 * POST /api/parishes
 */
export const createParish = async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      coordinates,
      phone,
      email,
      website,
      pastor,
      massTimes,
      avatar,
      members,
      status,
    } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        message: "Name and address are required",
      });
    }

    const createdBy = req.userId;

    const parish = new Parish({
      name,
      description,
      address,
      city,
      state,
      zipCode,
      coordinates,
      phone,
      email,
      website,
      pastor,
      massTimes: massTimes || [],
      avatar: avatar || null,
      members: members || 0,
      status: status || "active",
      createdBy,
    });

    await parish.save();
    await parish.populate("createdBy", "first_name last_name email");

    res.status(201).json({ message: "Parish created successfully", parish });
  } catch (error) {
    console.error("Error creating parish:", error);
    res.status(500).json({ message: "Error creating parish", error: error.message });
  }
};

/**
 * Update parish (admin only)
 * PUT /api/parishes/:id
 */
export const updateParish = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const parish = await Parish.findById(id);
    if (!parish) {
      return res.status(404).json({ message: "Parish not found" });
    }

    // Check if user is admin
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Unauthorized to update this parish" });
    }

    // Update fields
    const {
      name,
      description,
      address,
      city,
      state,
      zipCode,
      coordinates,
      phone,
      email,
      website,
      pastor,
      massTimes,
      avatar,
      members,
      status,
    } = req.body;

    if (name) parish.name = name;
    if (description !== undefined) parish.description = description;
    if (address) parish.address = address;
    if (city !== undefined) parish.city = city;
    if (state !== undefined) parish.state = state;
    if (zipCode !== undefined) parish.zipCode = zipCode;
    if (coordinates) parish.coordinates = coordinates;
    if (phone !== undefined) parish.phone = phone;
    if (email !== undefined) parish.email = email;
    if (website !== undefined) parish.website = website;
    if (pastor !== undefined) parish.pastor = pastor;
    if (massTimes) parish.massTimes = massTimes;
    if (avatar) parish.avatar = avatar;
    if (members !== undefined) parish.members = members;
    if (status && isAdmin) parish.status = status;

    await parish.save();
    await parish.populate("createdBy", "first_name last_name email");

    res.status(200).json({ message: "Parish updated successfully", parish });
  } catch (error) {
    console.error("Error updating parish:", error);
    res.status(500).json({ message: "Error updating parish", error: error.message });
  }
};

/**
 * Delete parish (admin only)
 * DELETE /api/parishes/:id
 */
export const deleteParish = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const parish = await Parish.findById(id);
    if (!parish) {
      return res.status(404).json({ message: "Parish not found" });
    }

    // Check if user is admin
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this parish" });
    }

    await parish.deleteOne();

    res.status(200).json({ message: "Parish deleted successfully" });
  } catch (error) {
    console.error("Error deleting parish:", error);
    res.status(500).json({ message: "Error deleting parish", error: error.message });
  }
};

