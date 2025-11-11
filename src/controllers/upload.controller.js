import { getAuthenticationParameters, generateThumbnails } from '../utils/imagekit.js';

/**
 * Get signed upload parameters for client-side direct upload
 * POST /api/upload/signature
 * Body: { folder?: string, fileName?: string }
 */
export const getUploadSignature = async (req, res) => {
  try {
    const { folder = '/marketplace', fileName } = req.body;
    const userId = req.userId;

    // Generate authentication parameters
    const authParams = getAuthenticationParameters();

    // Generate unique filename if not provided
    const uniqueFileName = fileName 
      ? `${Date.now()}-${fileName.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')}`
      : `${Date.now()}-${userId}`;

    res.status(200).json({
      token: authParams.token,
      signature: authParams.signature,
      expire: authParams.expire,
      fileName: uniqueFileName,
      folder: folder,
      // ImageKit upload endpoint URL for client-side direct upload
      uploadEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
      // Client should POST to: https://upload.imagekit.io/api/v1/files/upload
      uploadUrl: 'https://upload.imagekit.io/api/v1/files/upload',
    });
  } catch (error) {
    console.error('Error generating upload signature:', error);
    res.status(500).json({
      message: 'Error generating upload signature',
      error: error.message,
    });
  }
};

/**
 * Validate uploaded image and return transformation URLs
 * POST /api/upload/validate
 * Body: { imageUrl: string, fileId?: string, fileName?: string, size?: number, mimeType?: string }
 */
export const validateUploadedImage = async (req, res) => {
  try {
    const { imageUrl, fileId, fileName, size, mimeType } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ message: 'imageUrl is required' });
    }

    // Validate image URL is from ImageKit
    if (!imageUrl.includes('imagekit.io')) {
      return res.status(400).json({ message: 'Invalid image URL. Must be from ImageKit CDN.' });
    }

    // Generate thumbnails
    const thumbnails = generateThumbnails(imageUrl);

    // Validate size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (size && size > maxSize) {
      return res.status(400).json({ 
        message: 'Image size exceeds maximum limit of 10MB' 
      });
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (mimeType && !allowedTypes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ 
        message: 'Invalid image type. Only JPEG, PNG, and WebP are allowed.' 
      });
    }

    res.status(200).json({
      imageUrl,
      thumbnails,
      fileId: fileId || null,
      fileName: fileName || null,
      size: size || null,
      mimeType: mimeType || null,
    });
  } catch (error) {
    console.error('Error validating uploaded image:', error);
    res.status(500).json({
      message: 'Error validating uploaded image',
      error: error.message,
    });
  }
};

