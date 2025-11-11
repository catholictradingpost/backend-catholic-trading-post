import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    parish: {
      type: String,
      required: true
    },
    priest: {
      type: String,
      required: true
    },
    parishioners: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.every(item => typeof item === 'string');
        },
        message: props => `${props.value} is not a valid array of strings!`
      }
    },
    status: {
      type: String,
      enum: ['review', 'approved', 'denied'],
      default: 'review'
    },
    observation: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('Verification', verificationSchema);