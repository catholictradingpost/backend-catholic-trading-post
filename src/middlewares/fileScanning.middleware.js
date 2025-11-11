import crypto from "crypto";

/**
 * Simple file type detection by magic bytes
 * (file-type package requires ESM and may have compatibility issues)
 */
async function detectFileType(buffer) {
  // Check magic bytes for common image types
  const bytes = buffer.slice(0, 12);
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  
  // WebP: RIFF...WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    const webpHeader = buffer.slice(8, 12).toString('ascii');
    if (webpHeader === 'WEBP') {
      return { mime: 'image/webp', ext: 'webp' };
    }
  }
  
  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }
  
  return null;
}

/**
 * File scanning middleware
 * Validates file types, sizes, and scans for malicious content
 */

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
];

// Maximum file sizes (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Validate file type by magic bytes (more secure than MIME type)
 */
export const validateFileType = async (fileBuffer, expectedMimeType) => {
  try {
    // Detect file type from magic bytes
    const fileType = await detectFileType(fileBuffer);
    
    if (!fileType) {
      return {
        valid: false,
        error: "Unable to determine file type or file type not supported",
      };
    }

    // Check if detected type is allowed
    const detectedMime = fileType.mime;
    const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

    if (!allowedTypes.includes(detectedMime)) {
      return {
        valid: false,
        error: `File type ${detectedMime} is not allowed`,
      };
    }

    // If expected MIME type is provided, verify it matches
    if (expectedMimeType && detectedMime !== expectedMimeType) {
      return {
        valid: false,
        error: "File type mismatch. File may be corrupted or malicious.",
      };
    }

    return {
      valid: true,
      mimeType: detectedMime,
      ext: fileType.ext,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Error validating file type: " + error.message,
    };
  }
};

/**
 * Scan file for suspicious patterns
 */
export const scanFileContent = (fileBuffer) => {
  const bufferString = fileBuffer.toString("binary");
  const suspiciousPatterns = [
    /<script/i, // Script tags
    /javascript:/i, // JavaScript protocol
    /onerror=/i, // Event handlers
    /onload=/i,
    /eval\(/i, // Eval function
    /base64/i, // Base64 encoded content (can be suspicious)
  ];

  const foundPatterns = [];
  suspiciousPatterns.forEach((pattern) => {
    if (pattern.test(bufferString)) {
      foundPatterns.push(pattern.toString());
    }
  });

  return {
    safe: foundPatterns.length === 0,
    suspiciousPatterns: foundPatterns,
  };
};

/**
 * Validate file size
 */
export const validateFileSize = (fileSize, fileType = "image") => {
  const maxSize = fileType === "image" ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  return {
    valid: true,
  };
};

/**
 * Calculate file hash for duplicate detection
 */
export const calculateFileHash = (fileBuffer) => {
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

/**
 * Middleware to scan uploaded files
 */
export const scanUploadedFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return next();
    }

    const scanResults = [];

    for (const file of req.files) {
      // Validate file size
      const sizeValidation = validateFileSize(
        file.size,
        file.mimetype?.startsWith("image/") ? "image" : "document"
      );
      if (!sizeValidation.valid) {
        return res.status(400).json({
          message: "File validation failed",
          error: sizeValidation.error,
          fileName: file.originalname,
        });
      }

      // Validate file type by magic bytes
      const typeValidation = await validateFileType(
        file.buffer,
        file.mimetype
      );
      if (!typeValidation.valid) {
        return res.status(400).json({
          message: "File validation failed",
          error: typeValidation.error,
          fileName: file.originalname,
        });
      }

      // Scan for suspicious content (only for images that might contain embedded scripts)
      if (typeValidation.mimeType.startsWith("image/")) {
        const contentScan = scanFileContent(file.buffer);
        if (!contentScan.safe) {
          return res.status(400).json({
            message: "File contains suspicious content",
            error: "File may contain malicious code",
            fileName: file.originalname,
            suspiciousPatterns: contentScan.suspiciousPatterns,
          });
        }
      }

      // Calculate file hash
      const fileHash = calculateFileHash(file.buffer);
      file.fileHash = fileHash;

      scanResults.push({
        fileName: file.originalname,
        mimeType: typeValidation.mimeType,
        size: file.size,
        hash: fileHash,
        safe: true,
      });
    }

    // Attach scan results to request
    req.fileScanResults = scanResults;

    next();
  } catch (error) {
    console.error("Error scanning files:", error);
    return res.status(500).json({
      message: "Error validating uploaded files",
      error: error.message,
    });
  }
};

export default {
  validateFileType,
  validateFileSize,
  scanFileContent,
  calculateFileHash,
  scanUploadedFiles,
};

