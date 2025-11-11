import Event from "../models/event.model.js";
import RSVP from "../models/rsvp.model.js";
import User from "../models/user.model.js";
import Questionnaire from "../models/questionnaire.model.js";
import Verification from "../models/verification.model.js";

/**
 * Get all events (with filters)
 * GET /api/events
 */
export const getEvents = async (req, res) => {
  try {
    const {
      status = "published", // draft, published, cancelled, completed
      upcoming = "true", // true = only upcoming, false = all, "past" = only past
      category,
      city,
      state,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    // Status filter
    if (status !== "all") {
      filter.status = status;
    }

    // Date filter
    const now = new Date();
    if (upcoming === "true") {
      filter.eventDate = { $gte: now };
    } else if (upcoming === "past") {
      filter.eventDate = { $lt: now };
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Location filters
    if (city) {
      filter["venue.city"] = new RegExp(city, "i");
    }
    if (state) {
      filter["venue.state"] = new RegExp(state, "i");
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get user verification status if authenticated
    let isVerifiedCatholic = false;
    if (req.userId) {
      const questionnaire = await Questionnaire.findOne({ user: req.userId });
      const verification = await Verification.findOne({ user: req.userId });
      isVerifiedCatholic =
        (questionnaire && questionnaire.status === "verified") ||
        (verification && verification.status === "approved");
    }

    // Filter events based on access control
    const accessFilter = {
      $or: [
        { "accessControl.verifiedCatholicsOnly": false },
        { "accessControl.allowNonCatholics": true },
        ...(isVerifiedCatholic ? [{ "accessControl.verifiedCatholicsOnly": true }] : []),
      ],
    };

    const finalFilter = { ...filter, ...accessFilter };

    const [total, events] = await Promise.all([
      Event.countDocuments(finalFilter),
      Event.find(finalFilter)
        .populate("host", "first_name last_name email avatar")
        .sort({ eventDate: 1 }) // Sort by event date ascending
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
    ]);

    // Get RSVP counts for each event
    const eventsWithRSVP = await Promise.all(
      events.map(async (event) => {
        const rsvpCount = await RSVP.countDocuments({
          event: event._id,
          status: "attending",
        });
        return {
          ...event,
          attendeeCount: rsvpCount,
        };
      })
    );

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      events: eventsWithRSVP,
    });
  } catch (error) {
    console.error("Error getting events:", error);
    res.status(500).json({ message: "Error getting events", error: error.message });
  }
};

/**
 * Get single event by ID
 * GET /api/events/:id
 */
export const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || null; // Handle unauthenticated users

    const event = await Event.findById(id).populate(
      "host",
      "first_name last_name email avatar"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check access control
    if (userId) {
      const questionnaire = await Questionnaire.findOne({ user: userId });
      const verification = await Verification.findOne({ user: userId });
      const isVerifiedCatholic =
        (questionnaire && questionnaire.status === "verified") ||
        (verification && verification.status === "approved");

      if (event.accessControl.verifiedCatholicsOnly && !isVerifiedCatholic) {
        if (!event.accessControl.allowNonCatholics) {
          return res.status(403).json({
            message: "This event is restricted to verified Catholic members only.",
            requiresVerification: true,
          });
        }
      }
    } else {
      // Unauthenticated users can only see events that allow non-Catholics
      if (event.accessControl.verifiedCatholicsOnly && !event.accessControl.allowNonCatholics) {
        return res.status(403).json({
          message: "This event is restricted to verified Catholic members only.",
          requiresVerification: true,
        });
      }
    }

    // Check status access
    if (event.status !== "published" && (!userId || event.host._id.toString() !== userId)) {
      // Only host or admin can see non-published events
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
          return res.status(403).json({ message: "Event not found or not accessible" });
        }
      } else {
        return res.status(403).json({ message: "Event not found or not accessible" });
      }
    }

    // Get RSVP information
    const rsvpCount = await RSVP.countDocuments({
      event: id,
      status: "attending",
    });

    // Get user's RSVP status if logged in
    let userRSVP = null;
    if (userId) {
      userRSVP = await RSVP.findOne({
        event: id,
        user: userId,
      });
    }

    // Get all RSVPs (for host/admin)
    let allRSVPs = [];
    if (event.host._id.toString() === userId || req.isAdmin) {
      allRSVPs = await RSVP.find({ event: id })
        .populate("user", "first_name last_name email")
        .sort({ rsvpAt: -1 });
    }

    res.status(200).json({
      event: {
        ...event.toObject(),
        attendeeCount: rsvpCount,
        userRSVP,
        rsvps: allRSVPs,
      },
    });
  } catch (error) {
    console.error("Error getting event:", error);
    res.status(500).json({ message: "Error getting event", error: error.message });
  }
};

/**
 * Create new event (admin only)
 * POST /api/events
 */
export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      eventDate,
      eventTime,
      venue,
      accessControl,
      rsvp,
      image,
      category,
      tags,
    } = req.body;

    const hostId = req.userId;

    if (!title || !eventDate || !eventTime || !venue?.name) {
      return res.status(400).json({
        message: "Title, event date, event time, and venue name are required",
      });
    }

    // Validate event date is in the future (unless admin override)
    const eventDateTime = new Date(eventDate);
    if (eventDateTime < new Date() && req.body.allowPastDate !== true) {
      return res.status(400).json({
        message: "Event date must be in the future",
      });
    }

    const event = new Event({
      title,
      description,
      eventDate: eventDateTime,
      eventTime,
      venue: {
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        zipCode: venue.zipCode,
        coordinates: venue.coordinates,
      },
      host: hostId,
      accessControl: {
        verifiedCatholicsOnly: accessControl?.verifiedCatholicsOnly ?? true,
        allowNonCatholics: accessControl?.allowNonCatholics ?? false,
      },
      rsvp: {
        enabled: rsvp?.enabled ?? true,
        required: rsvp?.required ?? false,
        maxAttendees: rsvp?.maxAttendees || null,
        deadline: rsvp?.deadline ? new Date(rsvp.deadline) : null,
      },
      image: image || null,
      category: category || "Community",
      tags: tags || [],
      status: "published", // Admin-created events are published by default
    });

    await event.save();
    await event.populate("host", "first_name last_name email avatar");

    res.status(201).json({ message: "Event created successfully", event });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Error creating event", error: error.message });
  }
};

/**
 * Update event (admin/host only)
 * PUT /api/events/:id
 */
export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user is host or admin
    const isHost = event.host.toString() === userId;
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isHost && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to update this event" });
    }

    // Update fields
    const {
      title,
      description,
      eventDate,
      eventTime,
      venue,
      accessControl,
      rsvp,
      image,
      category,
      tags,
      status,
    } = req.body;

    if (title) event.title = title;
    if (description !== undefined) event.description = description;
    if (eventDate) event.eventDate = new Date(eventDate);
    if (eventTime) event.eventTime = eventTime;
    if (venue) {
      event.venue = {
        name: venue.name || event.venue.name,
        address: venue.address || event.venue.address,
        city: venue.city || event.venue.city,
        state: venue.state || event.venue.state,
        zipCode: venue.zipCode || event.venue.zipCode,
        coordinates: venue.coordinates || event.venue.coordinates,
      };
    }
    if (accessControl) {
      event.accessControl = {
        verifiedCatholicsOnly:
          accessControl.verifiedCatholicsOnly !== undefined
            ? accessControl.verifiedCatholicsOnly
            : event.accessControl.verifiedCatholicsOnly,
        allowNonCatholics:
          accessControl.allowNonCatholics !== undefined
            ? accessControl.allowNonCatholics
            : event.accessControl.allowNonCatholics,
      };
    }
    if (rsvp) {
      event.rsvp = {
        enabled: rsvp.enabled !== undefined ? rsvp.enabled : event.rsvp.enabled,
        required: rsvp.required !== undefined ? rsvp.required : event.rsvp.required,
        maxAttendees: rsvp.maxAttendees !== undefined ? rsvp.maxAttendees : event.rsvp.maxAttendees,
        deadline: rsvp.deadline ? new Date(rsvp.deadline) : event.rsvp.deadline,
      };
    }
    if (image) event.image = image;
    if (category) event.category = category;
    if (tags) event.tags = tags;
    if (status && isAdmin) event.status = status; // Only admin can change status

    await event.save();
    await event.populate("host", "first_name last_name email avatar");

    res.status(200).json({ message: "Event updated successfully", event });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Error updating event", error: error.message });
  }
};

/**
 * Delete event (admin/host only)
 * DELETE /api/events/:id
 */
export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user is host or admin
    const isHost = event.host.toString() === userId;
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isHost && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to delete this event" });
    }

    // Delete all RSVPs
    await RSVP.deleteMany({ event: id });

    // Delete event
    await event.deleteOne();

    res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Error deleting event", error: error.message });
  }
};

/**
 * RSVP to event
 * POST /api/events/:id/rsvp
 */
export const rsvpToEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { status, guests, notes } = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if RSVP is enabled
    if (!event.rsvp.enabled) {
      return res.status(400).json({ message: "RSVP is not enabled for this event" });
    }

    // Check RSVP deadline
    if (event.rsvp.deadline && new Date() > new Date(event.rsvp.deadline)) {
      return res.status(400).json({ message: "RSVP deadline has passed" });
    }

    // Check access control
    const questionnaire = await Questionnaire.findOne({ user: userId });
    const verification = await Verification.findOne({ user: userId });
    const isVerifiedCatholic =
      (questionnaire && questionnaire.status === "verified") ||
      (verification && verification.status === "approved");

    if (event.accessControl.verifiedCatholicsOnly && !isVerifiedCatholic) {
      if (!event.accessControl.allowNonCatholics) {
        return res.status(403).json({
          message: "This event is restricted to verified Catholic members only.",
          requiresVerification: true,
        });
      }
    }

    // Check max attendees if set
    if (event.rsvp.maxAttendees && status === "attending") {
      const currentAttendees = await RSVP.countDocuments({
        event: id,
        status: "attending",
      });
      const totalGuests = (guests || 0) + 1; // User + guests
      if (currentAttendees + totalGuests > event.rsvp.maxAttendees) {
        return res.status(400).json({
          message: `Event is full. Maximum ${event.rsvp.maxAttendees} attendees allowed.`,
        });
      }
    }

    // Create or update RSVP
    const rsvp = await RSVP.findOneAndUpdate(
      { event: id, user: userId },
      {
        event: id,
        user: userId,
        status: status || "attending",
        guests: guests || 0,
        notes: notes || "",
        rsvpAt: new Date(),
      },
      { upsert: true, new: true }
    ).populate("user", "first_name last_name email");

    res.status(200).json({ message: "RSVP updated successfully", rsvp });
  } catch (error) {
    console.error("Error RSVPing to event:", error);
    res.status(500).json({ message: "Error RSVPing to event", error: error.message });
  }
};

/**
 * Cancel RSVP
 * DELETE /api/events/:id/rsvp
 */
export const cancelRSVP = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const rsvp = await RSVP.findOneAndDelete({ event: id, user: userId });

    if (!rsvp) {
      return res.status(404).json({ message: "RSVP not found" });
    }

    res.status(200).json({ message: "RSVP cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling RSVP:", error);
    res.status(500).json({ message: "Error cancelling RSVP", error: error.message });
  }
};

/**
 * Get event RSVPs (host/admin only)
 * GET /api/events/:id/rsvps
 */
export const getEventRSVPs = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Check if user is host or admin
    const isHost = event.host.toString() === userId;
    const user = await User.findById(userId).populate("roles");
    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role.toLowerCase().includes("admin")
    );

    if (!isHost && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to view RSVPs" });
    }

    const rsvps = await RSVP.find({ event: id })
      .populate("user", "first_name last_name email phone")
      .sort({ rsvpAt: -1 });

    // Group by status
    const grouped = {
      attending: rsvps.filter((r) => r.status === "attending"),
      not_attending: rsvps.filter((r) => r.status === "not_attending"),
      maybe: rsvps.filter((r) => r.status === "maybe"),
    };

    res.status(200).json({
      total: rsvps.length,
      rsvps: grouped,
      all: rsvps,
    });
  } catch (error) {
    console.error("Error getting RSVPs:", error);
    res.status(500).json({ message: "Error getting RSVPs", error: error.message });
  }
};

