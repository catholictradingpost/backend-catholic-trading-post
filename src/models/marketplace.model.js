import mongoose from "mongoose";

const marketplaceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: "USD"
  },
  description: {
    type: String,
    trim: true
  },
  // Status: draft → active → sold; can be rejected by moderation
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'sold', 'rejected'],
    default: 'draft'
  },
  // Location information
  location: {
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, default: 'USA', trim: true },
    // Optional: full address string
    address: { type: String, trim: true },
    // Coordinates for distance calculation (GeoJSON format for MongoDB geospatial queries)
    // Stored as [longitude, latitude] array for MongoDB compatibility
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere'
      }
    }
  },
  // Item condition
  condition: {
    type: String,
    enum: ['new', 'like-new', 'excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  // Moderation fields
  moderation: {
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    notes: { type: String, trim: true }
  },
  // Auto-specific fields (for automobiles category)
  autoDetails: {
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number, min: 1900, max: new Date().getFullYear() + 1 },
    mileage: { type: Number, min: 0 },
    vehicleType: {
      type: String,
      enum: ['sedan', 'hatchback', 'motorcycle'],
      trim: true
    },
    // VIN (optional)
    vin: { type: String, trim: true }
  },
  photos: [
    {
      url: { type: String, required: true }, // Full-size CDN URL
      thumbnailUrl: { type: String }, // Thumbnail CDN URL
      fileId: { type: String }, // ImageKit file ID for management
      name: { type: String }, // Original filename
      isCover: { type: Boolean, default: false }, // Cover image flag
      uploadedAt: { type: Date, default: Date.now },
      size: { type: Number }, // File size in bytes
      mimeType: { type: String }, // MIME type (image/jpeg, etc.)
    }
  ],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  // Timestamps for status changes
  activatedAt: { type: Date },
  soldAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for search and filtering
marketplaceSchema.index({ status: 1, category: 1 });
marketplaceSchema.index({ 'location.city': 1, 'location.state': 1 });
marketplaceSchema.index({ price: 1 });
marketplaceSchema.index({ condition: 1 });
marketplaceSchema.index({ title: 'text', description: 'text' });
marketplaceSchema.index({ owner: 1, status: 1 });
// Geospatial index for distance queries (2dsphere for spherical calculations)
marketplaceSchema.index({ 'location.coordinates': '2dsphere' });

export default mongoose.model("Marketplace", marketplaceSchema);
