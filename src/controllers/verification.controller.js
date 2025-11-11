import Verification from '../models/verification.model.js';
import User from '../models/user.model.js';
import Roles from '../models/role.model.js';
import { sendVerificationApprovalEmail, sendVerificationDenialEmail } from '../libs/emailService.js';

// Get all verifications
export const getAllVerifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, status, startDate, endDate } = req.query;

    const filters = {};
    if (userId) filters.user = userId;
    if (status) filters.status = status;
    if (startDate && endDate) {
      filters.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const verifications = await Verification.find(filters)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('user', 'email first_name last_name')
      .exec();

    const totalCount = await Verification.countDocuments(filters);

    res.status(200).json({
      data: verifications,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving verifications', error: error.message });
  }
};

// Get a verification by ID
export const getVerificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const verification = await Verification.findById(id).populate('user', 'email first_name last_name');

    if (!verification) {
      return res.status(404).json({ message: 'Verification not found.' });
    }

    res.status(200).json(verification);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving verification', error: error.message });
  }
};

// Create a new verification
export const createVerification = async (req, res) => {
  try {
    const { parish, priest, parishioners } = req.body;
    const userId = req.userId;

    if (!Array.isArray(parishioners) || !parishioners.every(p => typeof p === 'string')) {
      return res.status(400).json({ message: "Parishioners must be an array of strings." });
    }

    const existingVerification = await Verification.findOne({ user: userId });
    if (existingVerification) {
      return res.status(400).json({ message: 'You already have a verification registered.' });
    }

    const newVerification = new Verification({
      user: userId,
      parish,
      priest,
      parishioners,
    });

    await newVerification.save();

    res.status(201).json({
      message: 'Verification created successfully',
      verification: newVerification,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating verification', error: error.message });
  }
};

// Update the status of a verification
export const updateVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, observation } = req.body;

    const user = req.user;
    const userRoles = user.roles.map(role => role.name);

    if (!userRoles.includes('Super User') && !userRoles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized to approve or deny verification.' });
    }

    const verification = await Verification.findById(id);

    if (!verification) {
      return res.status(404).json({ message: 'Verification not found.' });
    }

    verification.status = status;
    verification.observation = observation || '';
    await verification.save();

    // Send email notification based on status
    try {
      const verifiedUser = await User.findById(verification.user);
      if (verifiedUser && verifiedUser.email) {
        if (status === 'approved') {
          await sendVerificationApprovalEmail(
            verifiedUser.email,
            verifiedUser.first_name || 'there'
          );
        } else if (status === 'denied') {
          // Calculate correction deadline (7 days from now)
          const correctionDeadline = new Date();
          correctionDeadline.setDate(correctionDeadline.getDate() + 7);
          
          await sendVerificationDenialEmail(
            verifiedUser.email,
            verifiedUser.first_name || 'there',
            observation || 'The information provided did not meet our verification requirements.',
            correctionDeadline
          );
        }
      }
    } catch (emailError) {
      console.error('Error sending verification status email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({ message: 'Verification status updated successfully', verification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating verification status', error: error.message });
  }
};

// Delete a verification by ID
export const deleteVerification = async (req, res) => {
  try {
    const { id } = req.params;

    const user = req.user;
    const userRoles = user.roles.map(role => role.name);

    if (!userRoles.includes('Super User') && !userRoles.includes('Admin')) {
      return res.status(403).json({ message: 'Unauthorized to delete verification.' });
    }

    const verification = await Verification.findByIdAndDelete(id);

    if (!verification) {
      return res.status(404).json({ message: 'Verification not found.' });
    }

    res.status(200).json({ message: 'Verification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting verification', error: error.message });
  }
};

// Update your own verification
export const updateOwnVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { parish, priest, parishioners } = req.body;

    const verification = await Verification.findById(id);

    if (!verification) {
      return res.status(404).json({ message: 'Verification not found.' });
    }

    if (!Array.isArray(parishioners) || !parishioners.every(p => typeof p === 'string')) {
      return res.status(400).json({ message: "Parishioners must be an array of strings." });
    }

    if (verification.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'You can only update your own verification.' });
    }

    if (parish) verification.parish = parish;
    if (priest) verification.priest = priest;
    if (parishioners) verification.parishioners = parishioners;

    verification.updatedAt = Date.now();

    await verification.save();

    res.status(200).json({
      message: 'Verification updated successfully',
      verification
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating verification', error: error.message });
  }
};