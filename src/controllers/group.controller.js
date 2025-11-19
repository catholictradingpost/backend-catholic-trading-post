import Group from "../models/group.model.js";
import User from "../models/user.model.js";

/**
 * Get all groups (with filters)
 * GET /api/groups
 */
export const getGroups = async (req, res) => {
  try {
    const {
      status = "active", // active, inactive, pending, archived, all
      category,
      city,
      state,
      search, // Text search in name, description, location
      isPublic = "true", // true, false, all
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Status filter
    if (status !== "all") {
      filter.status = status;
    }

    // Public/private filter
    if (isPublic !== "all") {
      filter.isPublic = isPublic === "true";
    }

    // Category filter
    if (category) {
      filter.category = new RegExp(category, "i");
    }

    // Location filters
    if (city) {
      filter.city = new RegExp(city, "i");
    }
    if (state) {
      filter.state = new RegExp(state, "i");
    }

    // Text search (name, description, location)
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { description: new RegExp(search, "i") },
        { location: new RegExp(search, "i") },
        { city: new RegExp(search, "i") },
        { state: new RegExp(search, "i") },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [total, groups] = await Promise.all([
      Group.countDocuments(filter),
      Group.find(filter)
        .populate("leader", "first_name last_name email avatar")
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
      groups,
    });
  } catch (error) {
    console.error("Error getting groups:", error);
    res.status(500).json({ message: "Error getting groups", error: error.message });
  }
};

/**
 * Get single group by ID
 * GET /api/groups/:id
 */
export const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id)
      .populate("leader", "first_name last_name email avatar")
      .populate("createdBy", "first_name last_name email");

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check status - only show active groups to non-admins
    if (group.status !== "active") {
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
          return res.status(403).json({ message: "Group not found or not accessible" });
        }
      } else {
        return res.status(403).json({ message: "Group not found or not accessible" });
      }
    }

    // Check if group is public
    if (!group.isPublic && (!req.userId || group.leader?._id?.toString() !== req.userId)) {
      return res.status(403).json({ message: "This is a private group" });
    }

    res.status(200).json({ group });
  } catch (error) {
    console.error("Error getting group:", error);
    res.status(500).json({ message: "Error getting group", error: error.message });
  }
};

/**
 * Create new group (authenticated users)
 * POST /api/groups
 */
export const createGroup = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      tags,
      location,
      address,
      city,
      state,
      zipCode,
      coordinates,
      avatar,
      members,
      leader,
      meetingSchedule,
      contactEmail,
      contactPhone,
      isPublic,
      requiresApproval,
      maxMembers,
      status,
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    const createdBy = req.userId;
    const groupLeader = leader || createdBy; // Default to creator if no leader specified

    const group = new Group({
      name,
      description,
      category,
      tags: tags || [],
      location,
      address,
      city,
      state,
      zipCode,
      coordinates,
      avatar: avatar || null,
      members: members || 0,
      leader: groupLeader,
      meetingSchedule: meetingSchedule || null,
      contactEmail,
      contactPhone,
      isPublic: isPublic !== undefined ? isPublic : true,
      requiresApproval: requiresApproval !== undefined ? requiresApproval : false,
      maxMembers: maxMembers || null,
      status: status || "active",
      createdBy,
    });

    await group.save();
    await group.populate("leader", "first_name last_name email avatar");
    await group.populate("createdBy", "first_name last_name email");

    res.status(201).json({ message: "Group created successfully", group });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Error creating group", error: error.message });
  }
};

/**
 * Update group (leader/admin only)
 * PUT /api/groups/:id
 */
export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is leader or admin
    const isLeader = group.leader?.toString() === userId || group.createdBy?.toString() === userId;
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isLeader && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to update this group" });
    }

    // Update fields
    const {
      name,
      description,
      category,
      tags,
      location,
      address,
      city,
      state,
      zipCode,
      coordinates,
      avatar,
      members,
      leader,
      meetingSchedule,
      contactEmail,
      contactPhone,
      isPublic,
      requiresApproval,
      maxMembers,
      status,
    } = req.body;

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (category !== undefined) group.category = category;
    if (tags) group.tags = tags;
    if (location !== undefined) group.location = location;
    if (address !== undefined) group.address = address;
    if (city !== undefined) group.city = city;
    if (state !== undefined) group.state = state;
    if (zipCode !== undefined) group.zipCode = zipCode;
    if (coordinates) group.coordinates = coordinates;
    if (avatar) group.avatar = avatar;
    if (members !== undefined) group.members = members;
    if (leader) group.leader = leader;
    if (meetingSchedule) group.meetingSchedule = meetingSchedule;
    if (contactEmail !== undefined) group.contactEmail = contactEmail;
    if (contactPhone !== undefined) group.contactPhone = contactPhone;
    if (isPublic !== undefined) group.isPublic = isPublic;
    if (requiresApproval !== undefined) group.requiresApproval = requiresApproval;
    if (maxMembers !== undefined) group.maxMembers = maxMembers;
    if (status && (isAdmin || isLeader)) group.status = status; // Only admin/leader can change status

    await group.save();
    await group.populate("leader", "first_name last_name email avatar");
    await group.populate("createdBy", "first_name last_name email");

    res.status(200).json({ message: "Group updated successfully", group });
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Error updating group", error: error.message });
  }
};

/**
 * Delete group (leader/admin only)
 * DELETE /api/groups/:id
 */
export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Check if user is leader or admin
    const isLeader = group.leader?.toString() === userId || group.createdBy?.toString() === userId;
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isLeader && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this group" });
    }

    await group.deleteOne();

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Error deleting group", error: error.message });
  }
};

