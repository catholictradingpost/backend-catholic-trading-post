import Marketplace from "../models/marketplace.model.js";
import { uploadToImageKit, generateThumbnails } from "../utils/imagekit.js";
import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";
import { validateCategory, isFreeCategory, getCategoryPricing } from "../utils/categoryValidation.js";

// Función para subir archivo a ImageKit desde buffer con transformaciones
const uploadToImageKitWithTransformations = async (file, isCover = false) => {
  if (!file?.buffer) {
    throw new Error("Archivo inválido para subir a ImageKit");
  }

  const uploaded = await uploadToImageKit({
    file: file.buffer.toString("base64"),
    fileName: `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`,
    folder: "/marketplace",
  });

  // Generate thumbnails
  const thumbnails = generateThumbnails(uploaded.url);

  return {
    url: uploaded.url, // Full-size CDN URL
    thumbnailUrl: thumbnails.medium, // Medium thumbnail CDN URL
    fileId: uploaded.fileId, // ImageKit file ID
    name: uploaded.name || file.originalname, // Original filename
    isCover: isCover, // Cover image flag
    size: file.size, // File size in bytes
    mimeType: file.mimetype, // MIME type
  };
};

// Crear un ítem en el marketplace
// Supports both server-side upload (req.files) and client-side direct upload (imageUrls)
export const createMarketplace = async (req, res) => {
  try {
    let { 
      title, 
      category, 
      price, 
      currency, 
      description, 
      coverImageIndex, 
      imageUrls,
      status, // draft, pending, active
      location, // { city, state, zipCode, country, address }
      condition, // new, like-new, excellent, good, fair, poor
      autoDetails // { make, model, year, mileage, vehicleType, vin }
    } = req.body;
    
    // Parse autoDetails if it's a JSON string (from FormData)
    if (autoDetails && typeof autoDetails === 'string') {
      try {
        autoDetails = JSON.parse(autoDetails);
      } catch (e) {
        // If parsing fails, return error instead of continuing with invalid data
        return res.status(400).json({
          message: 'Invalid autoDetails JSON format. Please provide valid JSON for vehicle details.',
          error: e.message
        });
      }
    }
    
    const owner = req.userId;
    const postingPolicy = req.postingPolicy;

    if (!title || !category || price == null) {
      return res.status(400).json({
        message: "Title, category, and price are required.",
      });
    }

    // Validate category with hard rules
    const categoryValidation = validateCategory(category, autoDetails);
    if (!categoryValidation.valid) {
      return res.status(400).json({
        message: categoryValidation.error,
      });
    }

    // Determine listing status (default: draft)
    const listingStatus = status || 'draft';
    
    // Skip payment for drafts and free categories
    const isDraft = listingStatus === 'draft';
    const isFree = isFreeCategory(category, price);
    const skipPayment = isDraft || isFree;

    // Validate image count (max 8 images)
    const serverUploadCount = req.files?.length || 0;
    const clientUploadCount = Array.isArray(imageUrls) ? imageUrls.length : 0;
    const totalImageCount = serverUploadCount + clientUploadCount;
    
    if (totalImageCount > 8) {
      return res.status(400).json({
        message: "Maximum 8 images allowed per listing",
      });
    }

    // Deduct credits if required (pay-per-post)
    // Skip payment for drafts, free categories, free users, and unlimited subscription users
    if (!skipPayment && postingPolicy && postingPolicy.deductCredits && postingPolicy.type !== 'free_user' && postingPolicy.type !== 'unlimited_subscription') {
      const creditCost = postingPolicy.creditCost || 1;
      
      // Verify user exists
      const user = await User.findById(owner);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Atomic credit deduction to prevent race conditions
      if (postingPolicy.subscription && postingPolicy.subscription._id) {
        // Try to deduct from subscription credits first (atomic operation)
        const subscription = await Subscription.findOneAndUpdate(
          { 
            _id: postingPolicy.subscription._id,
            postCredits: { $gte: creditCost }
          },
          { $inc: { postCredits: -creditCost } },
          { new: true }
        );

        if (subscription) {
          // Successfully deducted from subscription credits
          // Credits deducted, continue with listing creation
        } else {
          // Subscription credits insufficient, try user credits (atomic operation)
          const updatedUser = await User.findOneAndUpdate(
            { 
              _id: owner,
              postCredits: { $gte: creditCost }
            },
            { $inc: { postCredits: -creditCost } },
            { new: true }
          );

          if (!updatedUser) {
            // Get current balances for error message
            const currentSubscription = await Subscription.findById(postingPolicy.subscription._id);
            const currentUser = await User.findById(owner);
            return res.status(403).json({
              message: `Insufficient credits. You need ${creditCost} credit(s) to create this listing.`,
              availableCredits: (currentUser?.postCredits || 0) + (currentSubscription?.postCredits || 0),
              requiredCredits: creditCost,
              category: category || 'N/A',
            });
          }
        }
      } else {
        // Deduct from user credits only (atomic operation)
        const updatedUser = await User.findOneAndUpdate(
          { 
            _id: owner,
            postCredits: { $gte: creditCost }
          },
          { $inc: { postCredits: -creditCost } },
          { new: true }
        );

        if (!updatedUser) {
          const currentUser = await User.findById(owner);
          return res.status(403).json({
            message: `Insufficient credits. You need ${creditCost} credit(s) to create this listing. You have ${currentUser?.postCredits || 0} credit(s).`,
            availableCredits: currentUser?.postCredits || 0,
            requiredCredits: creditCost,
            category: category || 'N/A',
          });
        }
      }
    }

    // Build marketplace item
    const itemData = {
      title,
      category,
      price,
      currency: currency || 'USD',
      description,
      owner,
      status: listingStatus,
      condition: condition || 'good',
    };

    // Add location if provided
    if (location) {
      itemData.location = {
        city: location.city,
        state: location.state,
        zipCode: location.zipCode,
        country: location.country || 'USA',
        address: location.address,
      };
    }

    // Add auto details if provided (for automobiles category)
    if (autoDetails && categoryValidation.categoryInfo?.requiresAutoDetails) {
      itemData.autoDetails = {
        make: autoDetails.make,
        model: autoDetails.model,
        year: autoDetails.year,
        mileage: autoDetails.mileage,
        vehicleType: autoDetails.vehicleType,
        vin: autoDetails.vin,
      };
    }

    // Set moderation status based on listing status
    if (listingStatus === 'active' || listingStatus === 'pending') {
      itemData.moderation = {
        status: 'pending',
      };
    }

    // Set activatedAt if status is active
    if (listingStatus === 'active') {
      itemData.activatedAt = new Date();
    }

    const item = new Marketplace(itemData);
    await item.save();

    // Handle server-side uploads (multer)
    if (req.files?.length) {
      console.log(`Uploading ${req.files.length} file(s) to ImageKit...`);
      const coverIndex = coverImageIndex !== undefined ? parseInt(coverImageIndex) : 0;
      try {
        const uploadPromises = req.files.map((file, index) => 
          uploadToImageKitWithTransformations(file, index === coverIndex)
        );
        const photos = await Promise.all(uploadPromises);
        item.photos = photos;
        console.log(`Successfully uploaded ${photos.length} photo(s)`);
      } catch (uploadError) {
        console.error('Error uploading photos to ImageKit:', uploadError);
        // Don't fail the entire request if image upload fails
        // The item will be saved without photos
      }
    } else {
      console.log('No files received in req.files');
    }
    
    // Handle client-side direct uploads (ImageKit URLs)
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const clientPhotos = await Promise.all(
        imageUrls.map(async (imageData, index) => {
          // imageData can be a string (URL) or object with url, fileId, etc.
          const imageUrl = typeof imageData === 'string' ? imageData : imageData.url;
          const fileId = typeof imageData === 'object' ? imageData.fileId : null;
          const fileName = typeof imageData === 'object' ? imageData.fileName : null;
          const size = typeof imageData === 'object' ? imageData.size : null;
          const mimeType = typeof imageData === 'object' ? imageData.mimeType : null;
          
          // Validate ImageKit URL
          if (!imageUrl || !imageUrl.includes('imagekit.io')) {
            throw new Error('Invalid ImageKit URL');
          }
          
          // Generate thumbnails
          const thumbnails = generateThumbnails(imageUrl);
          
          // Determine if this should be cover (first image if no server uploads)
          const isCover = (!req.files || req.files.length === 0) && index === 0;
          
          return {
            url: imageUrl,
            thumbnailUrl: thumbnails.medium,
            fileId: fileId || null,
            name: fileName || null,
            isCover: isCover,
            size: size || null,
            mimeType: mimeType || null,
          };
        })
      );
      
      // Merge with server uploads or set as photos
      if (item.photos && item.photos.length > 0) {
        item.photos.push(...clientPhotos);
      } else {
        item.photos = clientPhotos;
      }
    }
    
    // Save the item with photos if any were uploaded
    if (item.photos && item.photos.length > 0) {
      await item.save();
      console.log('Item saved with photos');
    } else {
      console.log('No photos to save');
    }

    res.status(201).json({ 
      message: "Marketplace item creado", 
      item,
      creditsDeducted: postingPolicy?.deductCredits ? (postingPolicy.creditCost || 0) : 0,
      category: category,
      postingCost: postingPolicy?.creditCost || 0
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al crear item", error: error.message });
  }
};

// Helper function to convert miles to meters (for MongoDB geospatial queries)
const milesToMeters = (miles) => miles * 1609.34;

// Listar items with search and filters
export const getMarketplaces = async (req, res) => {
  try {
    const { 
      category, 
      status, 
      condition,
      city,
      state,
      minPrice,
      maxPrice,
      search, // Text search in title/description
      page = 1, 
      limit = 20,
      sortBy = 'createdAt', // createdAt, price, title
      sortOrder = 'desc', // asc, desc
      // Distance filtering
      userLatitude,
      userLongitude,
      maxDistance // in miles
    } = req.query;

    const filter = {};

    // Status filter (default: show active and draft listings)
    if (status) {
      filter.status = status;
    } else {
      // Default: show active listings (approved) and draft listings
      // This allows users to see their own drafts and all active listings
      filter.$or = [
        { status: 'active', 'moderation.status': 'approved' },
        { status: 'draft' }
      ];
    }

    // Category filter - apply to both conditions in $or if it exists
    if (category && category !== 'all') {
      if (filter.$or) {
        // If we have $or, we need to apply category to each condition
        filter.$and = [
          { $or: filter.$or },
          { category: category }
        ];
        delete filter.$or;
      } else {
        filter.category = category;
      }
    }

    // Condition filter
    if (condition) {
      filter.condition = condition;
    }

    // Location filters
    if (city) {
      filter['location.city'] = new RegExp(city, 'i');
    }
    if (state) {
      filter['location.state'] = new RegExp(state, 'i');
    }

    // Price range filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Text search (title and description)
    if (search) {
      const searchOr = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
      
      // If we already have $or for status, combine with $and
      if (filter.$or) {
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: filter.$or });
        filter.$and.push({ $or: searchOr });
        delete filter.$or;
      } else if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Build query with distance filtering if coordinates provided
    let query = Marketplace.find(filter);

    // Distance filtering using MongoDB geospatial queries
    if (userLatitude && userLongitude && maxDistance) {
      const lat = parseFloat(userLatitude);
      const lng = parseFloat(userLongitude);
      const distanceInMeters = milesToMeters(parseFloat(maxDistance));

      // Add geospatial filter using $geoWithin with $centerSphere
      // MongoDB requires coordinates in [longitude, latitude] format
      filter['location.coordinates'] = {
        $geoWithin: {
          $centerSphere: [
            [lng, lat], // [longitude, latitude]
            distanceInMeters / 6378100 // Convert meters to radians (Earth's radius in meters)
          ]
        }
      };

      // Also ensure coordinates exist and are in correct format
      filter['location.coordinates.type'] = 'Point';
      filter['location.coordinates.coordinates'] = { $exists: true, $ne: null };
    }

    const [total, items] = await Promise.all([
      Marketplace.countDocuments(filter),
      query
        .skip(skip)
        .limit(parseInt(limit))
        .populate("owner", "first_name last_name")
        .sort(sortOptions),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      items,
      filters: {
        category,
        status: status || 'active',
        condition,
        city,
        state,
        minPrice,
        maxPrice,
        search
      }
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener items", error: error.message });
  }
};

// Detalle de un item
export const getMarketplaceById = async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id).populate(
      "owner",
      "first_name last_name email"
    );
    if (!item)
      return res.status(404).json({ message: "Item no encontrado" });
    res.status(200).json({ item });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener item", error: error.message });
  }
};

// Actualizar un item
export const updateMarketplace = async (req, res) => {
  try {
    const { 
      title, 
      category, 
      price, 
      currency, 
      description, 
      coverImageIndex,
      status,
      location,
      condition,
      autoDetails
    } = req.body;
    const item = await Marketplace.findById(req.params.id);
    if (!item)
      return res.status(404).json({ message: "Item no encontrado" });
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    // Validate category if changed
    if (category && category !== item.category) {
      const categoryValidation = validateCategory(category, autoDetails);
      if (!categoryValidation.valid) {
        return res.status(400).json({
          message: categoryValidation.error,
        });
      }
    }

    // Update basic fields
    if (title) item.title = title;
    if (category) item.category = category;
    if (price !== undefined) item.price = price;
    if (currency) item.currency = currency;
    if (description !== undefined) item.description = description;
    if (condition) item.condition = condition;

    // Update location
    if (location) {
      item.location = {
        city: location.city || item.location?.city,
        state: location.state || item.location?.state,
        zipCode: location.zipCode || item.location?.zipCode,
        country: location.country || item.location?.country || 'USA',
        address: location.address || item.location?.address,
      };
    }

    // Update auto details
    if (autoDetails) {
      item.autoDetails = {
        make: autoDetails.make || item.autoDetails?.make,
        model: autoDetails.model || item.autoDetails?.model,
        year: autoDetails.year || item.autoDetails?.year,
        mileage: autoDetails.mileage || item.autoDetails?.mileage,
        vehicleType: autoDetails.vehicleType || item.autoDetails?.vehicleType,
        vin: autoDetails.vin || item.autoDetails?.vin,
      };
    }

    // Handle status changes
    if (status && status !== item.status) {
      const oldStatus = item.status;
      item.status = status;

      // Set timestamps for status changes
      if (status === 'active' && oldStatus !== 'active') {
        item.activatedAt = new Date();
        // Set moderation to pending if activating
        if (!item.moderation || item.moderation.status === 'pending') {
          item.moderation = {
            status: 'pending',
            ...item.moderation
          };
        }
      } else if (status === 'sold') {
        item.soldAt = new Date();
      }
    }

    // Validate total image count (max 8 images)
    const currentPhotoCount = item.photos?.length || 0;
    const { imageUrls } = req.body;
    const serverUploadCount = req.files?.length || 0;
    const clientUploadCount = Array.isArray(imageUrls) ? imageUrls.length : 0;
    const totalNewImages = serverUploadCount + clientUploadCount;
    
    if (currentPhotoCount + totalNewImages > 8) {
      return res.status(400).json({
        message: `Cannot exceed 8 images total. Current: ${currentPhotoCount}, attempting to add: ${totalNewImages}`,
      });
    }

    // Handle server-side uploads
    if (req.files?.length) {
      const uploadPromises = req.files.map((file) => 
        uploadToImageKitWithTransformations(file, false) // Don't auto-set cover on update
      );
      const newPhotos = await Promise.all(uploadPromises);
      item.photos.push(...newPhotos);
    }
    
    // Handle client-side direct uploads
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      const clientPhotos = await Promise.all(
        imageUrls.map(async (imageData) => {
          const imageUrl = typeof imageData === 'string' ? imageData : imageData.url;
          if (!imageUrl || !imageUrl.includes('imagekit.io')) {
            throw new Error('Invalid ImageKit URL');
          }
          
          const thumbnails = generateThumbnails(imageUrl);
          
          return {
            url: imageUrl,
            thumbnailUrl: thumbnails.medium,
            fileId: typeof imageData === 'object' ? imageData.fileId : null,
            name: typeof imageData === 'object' ? imageData.fileName : null,
            isCover: false, // Don't auto-set cover on update
            size: typeof imageData === 'object' ? imageData.size : null,
            mimeType: typeof imageData === 'object' ? imageData.mimeType : null,
          };
        })
      );
      item.photos.push(...clientPhotos);
    }

    // Update cover image if specified
    if (coverImageIndex !== undefined) {
      const coverIdx = parseInt(coverImageIndex);
      if (coverIdx >= 0 && coverIdx < item.photos.length) {
        // Reset all cover flags
        item.photos.forEach((photo, idx) => {
          photo.isCover = idx === coverIdx;
        });
      }
    }

    await item.save();
    res.status(200).json({ message: "Item actualizado", item });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al actualizar item", error: error.message });
  }
};

// Set cover image
export const setCoverImage = async (req, res) => {
  try {
    const { photoIndex } = req.body;
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }
    
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const index = parseInt(photoIndex);
    if (isNaN(index) || index < 0 || index >= item.photos.length) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    // Reset all cover flags
    item.photos.forEach((photo, idx) => {
      photo.isCover = idx === index;
    });

    await item.save();
    res.status(200).json({ message: "Cover image updated", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating cover image", error: error.message });
  }
};

// Delete image from listing
export const deleteImage = async (req, res) => {
  try {
    const { photoIndex } = req.body;
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }
    
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const index = parseInt(photoIndex);
    if (isNaN(index) || index < 0 || index >= item.photos.length) {
      return res.status(400).json({ message: "Invalid photo index" });
    }

    // Remove photo at index
    item.photos.splice(index, 1);

    // If deleted photo was cover, set first photo as cover
    if (item.photos.length > 0 && !item.photos.some(p => p.isCover)) {
      item.photos[0].isCover = true;
    }

    await item.save();
    res.status(200).json({ message: "Image deleted", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting image", error: error.message });
  }
};

// Eliminar un item
export const deleteMarketplace = async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);
    if (!item)
      return res.status(404).json({ message: "Item no encontrado" });
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }
    await item.deleteOne();
    res.status(200).json({ message: "Item eliminado" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al eliminar item", error: error.message });
  }
};

// Update listing status (draft → active → sold)
export const updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }
    
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const validStatuses = ['draft', 'pending', 'active', 'sold'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Allowed: ${validStatuses.join(', ')}` 
      });
    }

    const oldStatus = item.status;
    item.status = status;

    // Set timestamps for status changes
    if (status === 'active' && oldStatus !== 'active') {
      item.activatedAt = new Date();
      // Set moderation to pending if activating
      if (!item.moderation || item.moderation.status === 'pending') {
        item.moderation = {
          status: 'pending',
          ...item.moderation
        };
      }
    } else if (status === 'sold') {
      item.soldAt = new Date();
    }

    await item.save();
    res.status(200).json({ message: "Status updated", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating status", error: error.message });
  }
};

// Mark listing as sold
export const markAsSold = async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }
    
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    item.status = 'sold';
    item.soldAt = new Date();
    await item.save();

    res.status(200).json({ message: "Listing marked as sold", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error marking as sold", error: error.message });
  }
};

// Activate listing (draft → active)
export const activateListing = async (req, res) => {
  try {
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }
    
    if (item.owner.toString() !== req.userId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    if (item.status === 'sold') {
      return res.status(400).json({ message: "Cannot activate a sold listing" });
    }

    item.status = 'active';
    item.activatedAt = new Date();
    
    // Set moderation to pending
    item.moderation = {
      status: 'pending',
      ...item.moderation
    };

    await item.save();
    res.status(200).json({ message: "Listing activated", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error activating listing", error: error.message });
  }
};

// Get user's listings
export const getUserListings = async (req, res) => {
  try {
    const userId = req.userId;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { owner: userId };
    if (status) {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [total, items] = await Promise.all([
      Marketplace.countDocuments(filter),
      Marketplace.find(filter)
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      items,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting user listings", error: error.message });
  }
};

// Moderation: Approve listing (admin only)
export const approveListing = async (req, res) => {
  try {
    // Verify admin authorization
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(req.userId).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role === "Super User" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required to approve listings" });
    }

    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }

    item.moderation = {
      status: 'approved',
      reviewedBy: req.userId,
      reviewedAt: new Date(),
      ...item.moderation
    };

    // If status is pending, set to active
    if (item.status === 'pending') {
      item.status = 'active';
      if (!item.activatedAt) {
        item.activatedAt = new Date();
      }
    }

    await item.save();
    res.status(200).json({ message: "Listing approved", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error approving listing", error: error.message });
  }
};

// Moderation: Reject listing (admin only)
export const rejectListing = async (req, res) => {
  try {
    // Verify admin authorization
    const User = (await import("../models/user.model.js")).default;
    const user = await User.findById(req.userId).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleNames = user.roles.map((role) => role.name || role);
    const isAdmin = roleNames.some(
      (role) =>
        role === "Admin" ||
        role === "Super Usuario" ||
        role === "Super User" ||
        role.toLowerCase().includes("admin")
    );

    if (!isAdmin) {
      return res.status(403).json({ message: "Admin access required to reject listings" });
    }

    const { rejectionReason, notes } = req.body;
    const item = await Marketplace.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: "Item no encontrado" });
    }

    if (!rejectionReason) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    item.moderation = {
      status: 'rejected',
      reviewedBy: req.userId,
      reviewedAt: new Date(),
      rejectionReason,
      notes: notes || '',
    };

    item.status = 'rejected';

    await item.save();
    res.status(200).json({ message: "Listing rejected", item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error rejecting listing", error: error.message });
  }
};

// Get allowed categories
export const getAllowedCategories = async (req, res) => {
  try {
    const { getAllowedCategories } = await import('../utils/categoryValidation.js');
    const categories = getAllowedCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting categories", error: error.message });
  }
};
