import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema(
    {
        name: { 
            type: String, 
            required: true, 
            unique: true 
        },  // Module name
    },
    { 
        timestamps: true 
    }  // Automatically adds createdAt and updatedAt fields
);

const Module = mongoose.model('Module', moduleSchema);

export default Module;
