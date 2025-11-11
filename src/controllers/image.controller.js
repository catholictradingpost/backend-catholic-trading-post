import fs from "fs";
import path from "path";
import Image from "../models/image.model.js";

// Eliminar una imagen
export const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;

    // Buscar la imagen en la base de datos
    const image = await Image.findById(imageId);
    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Ruta completa del archivo en el servidor
    const imagePath = path.join(image.url);
    
    // Verificar si el archivo existe antes de eliminarlo
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath); // Eliminar la imagen del sistema de archivos
    }

    // Eliminar la referencia en la base de datos
    await image.deleteOne();

    res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ message: "Error deleting image", error: error.message });
  }
};

// Modificar una imagen manteniendo el mismo nombre
export const updateImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const newImage = req.file; // Nueva imagen cargada por el usuario

    if (!newImage) {
      return res.status(400).json({ message: "No new image provided" });
    }

    // Buscar la imagen original en la base de datos
    const oldImage = await Image.findById(imageId);
    if (!oldImage) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Obtener el nombre sin la extensión anterior
    const oldFileNameWithoutExt = path.basename(oldImage.url, path.extname(oldImage.url));

    // Obtener la nueva extensión del archivo
    const newFileExtension = path.extname(newImage.originalname).toLowerCase();

    // Generar la nueva ruta con el mismo nombre pero con la nueva extensión
    const newFilePath = path.join("uploads", `${oldFileNameWithoutExt}${newFileExtension}`);

    // Eliminar la imagen anterior si existe
    if (fs.existsSync(oldImage.url)) {
      fs.unlinkSync(oldImage.url);
    }

    // Mover la nueva imagen a la ubicación correcta con el mismo nombre
    fs.renameSync(newImage.path, newFilePath);

    // Actualizar la URL en la base de datos
    oldImage.url = newFilePath;
    await oldImage.save();

    res.status(200).json({ message: "Image updated successfully", image: oldImage });
  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({ message: "Error updating image", error: error.message });
  }
};
