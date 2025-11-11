// src/libs/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary with a specific folder and resource type
 * @param {Buffer} buffer - The file data
 * @param {String} folder - The Cloudinary folder
 * @param {String} resourceType - Type of the file (image, raw, video, etc.)
 * @returns {Promise<String>} - Returns the Cloudinary URL
 */
const uploadToCloudinary = (buffer, folder, resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// Upload image (jpg, png, etc.)
export const uploadImage = (buffer) => uploadToCloudinary(buffer, "chat/images", "image");

// Upload document (pdf, docx, etc.)
export const uploadDocuments = (buffer) => uploadToCloudinary(buffer, "chat/documents", "raw");

// Upload audio (mp3, ogg, etc.)
export const uploadAudio = (buffer) => uploadToCloudinary(buffer, "chat/audio", "video");
