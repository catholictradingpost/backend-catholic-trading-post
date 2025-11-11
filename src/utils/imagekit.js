import ImageKit from "imagekit";
import { v4 as uuidv4 } from "uuid";
import { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } from "../config.js";

const imagekit = new ImageKit({
  publicKey: IMAGEKIT_PUBLIC_KEY,
  privateKey: IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: IMAGEKIT_URL_ENDPOINT,
});

/**
 * Sube un archivo a ImageKit
 * @param {Object} options
 * @param {string|Buffer} options.file - Contenido del archivo (base64, buffer o URL)
 * @param {string} [options.fileName] - Nombre del archivo (sin espacios ni caracteres inválidos)
 * @param {string} [options.folder="/general"] - Carpeta destino en ImageKit
 * @returns {Promise<Object>} - Datos del archivo subido (url, thumbnail, id, nombre)
 */
export async function uploadToImageKit({ file, fileName, folder = "/general" }) {
  if (!file) throw new Error("No se recibió ningún archivo para subir a ImageKit.");

  // Limpia espacios y caracteres raros en el nombre si se pasa
  const sanitizedFileName = fileName
    ? fileName.replace(/\s+/g, "_").replace(/[^\w.-]/g, "")
    : `${uuidv4()}.jpg`;

  try {
    const response = await imagekit.upload({
      file,
      fileName: sanitizedFileName,
      folder,
    });

    return {
      url: response.url,
      thumbnailUrl: response.thumbnailUrl,
      fileId: response.fileId,
      name: response.name,
    };
  } catch (err) {
    console.error("Error al subir a ImageKit:", err.message);
    throw new Error("Error al subir el archivo a ImageKit");
  }
}

/**
 * Generate authentication parameters for client-side direct upload
 * @param {string} [token] - Optional token (for expiration)
 * @param {string} [expire] - Optional expiration timestamp
 * @returns {Object} - Authentication parameters for ImageKit client-side upload
 */
export function getAuthenticationParameters(token = "", expire = "") {
  try {
    return imagekit.getAuthenticationParameters(token, expire);
  } catch (err) {
    console.error("Error generating ImageKit authentication parameters:", err.message);
    throw new Error("Error generating upload authentication");
  }
}

/**
 * Generate thumbnail transformation URL using ImageKit URL transformation
 * @param {string} imageUrl - Original ImageKit URL
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @param {string} quality - Image quality (default: '80')
 * @returns {string} - Transformed thumbnail URL
 */
export function getThumbnailUrl(imageUrl, width = 300, height = 300, quality = '80') {
  if (!imageUrl) return '';
  
  try {
    // ImageKit URL transformation format using query parameters
    // https://ik.imagekit.io/your_imagekit_id/path/to/image.jpg?tr=w-300,h-300,q-80
    const url = new URL(imageUrl);
    const transformation = `w-${width},h-${height},q-${quality}`;
    
    // Add transformation as query parameter
    url.searchParams.set('tr', transformation);
    
    return url.toString();
  } catch (error) {
    console.error('Error generating thumbnail URL:', error);
    return imageUrl; // Return original URL if transformation fails
  }
}

/**
 * Generate multiple thumbnail sizes
 * @param {string} imageUrl - Original ImageKit URL
 * @returns {Object} - Thumbnail URLs for different sizes
 */
export function generateThumbnails(imageUrl) {
  return {
    small: getThumbnailUrl(imageUrl, 150, 150, '70'),
    medium: getThumbnailUrl(imageUrl, 300, 300, '80'),
    large: getThumbnailUrl(imageUrl, 600, 600, '85'),
    original: imageUrl,
  };
}

export default imagekit;
