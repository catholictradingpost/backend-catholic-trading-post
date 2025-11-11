import mongoose from 'mongoose';

/**
 * Audit Log Model
 * Tracks all admin actions for accountability and compliance
 */
const logSchema = new mongoose.Schema(
    {
        action: { 
            type: String, 
            required: true, 
            enum: [
                'create', 'update', 'delete', 'read', 'report',
                'approve', 'reject', 'suspend', 'ban', 'warn',
                'grant_entitlement', 'revoke_entitlement',
                'moderate_content', 'resolve_report',
                'manage_user', 'manage_listing', 'manage_event',
                'manage_subscription', 'manage_plan'
            ]
        },  // Action performed
        resource: { 
            type: String, 
            required: true 
        },  // Affected resource/module name
        resourceId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },  // ID of the affected resource
        resourceType: {
            type: String,
            enum: [
                'User', 'Post', 'Marketplace', 'Event', 'Subscription',
                'Plan', 'Report', 'Verification', 'Questionnaire',
                'Message', 'Comment', 'RSVP', 'ModerationList'
            ],
            default: null,
        },  // Type of resource
        user: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User', 
            required: true,
            index: true,
        },  // Reference to the user who performed the action
        // User role at time of action
        userRole: {
            type: String,
            default: null,
        },
        // IP address
        ipAddress: {
            type: String,
            default: null,
        },
        // User agent
        userAgent: {
            type: String,
            default: null,
        },
        // Action details (what changed)
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },  // Additional details about the action (before/after values, etc.)
        // Outcome
        outcome: {
            type: String,
            enum: ['success', 'failure', 'partial'],
            default: 'success',
        },
        // Error message if action failed
        error: {
            type: String,
            default: null,
        },
        date: { 
            type: Date, 
            default: Date.now,
            index: true,
        },  // Date of the action
    },
    { 
        timestamps: true 
    }  // To automatically get creation and update dates
);

// Indexes for efficient queries
logSchema.index({ user: 1, date: -1 });
logSchema.index({ resourceType: 1, resourceId: 1 });
logSchema.index({ action: 1, date: -1 });
logSchema.index({ date: -1 }); // For recent activity queries

const Log = mongoose.model('Log', logSchema);

export default Log;
