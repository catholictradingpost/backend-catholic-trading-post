import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
    {
        role: {
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Role', 
            required: true 
        },  // Reference to Role model
        module: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'Module', 
            required: true 
        },  // Reference to Module model
        actions: {  // Object controlling which actions are enabled
            create: { type: Boolean, default: false },  // Create access
            update: { type: Boolean, default: false },  // Update access
            delete: { type: Boolean, default: false },  // Delete access
            read: { type: Boolean, default: false }     // Read access
        }
    },
    { 
        timestamps: true 
    }  // Automatically adds createdAt and updatedAt fields
);

const Permission = mongoose.model('Permission', permissionSchema);

export default Permission;
