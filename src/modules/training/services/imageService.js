/**
 * Centralized service for handling image uploads via Firebase Storage
 * Migrated from ImgBB for better reliability and control
 */

import { storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Generates a unique filename for uploaded images
 * @param {File} file - The file being uploaded
 * @returns {string} - Unique filename
 */
const generateFileName = (file) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = file.name?.split('.').pop() || 'jpg';
    return `${timestamp}_${random}.${extension}`;
};

/**
 * Converts a base64 string to a Blob
 * @param {string} base64 - Base64 string (with or without data URI prefix)
 * @returns {Blob} - Blob object
 */
const base64ToBlob = (base64) => {
    // Handle data URI format
    const parts = base64.includes(',') ? base64.split(',') : ['data:image/jpeg;base64', base64];
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);

    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }

    return new Blob([u8arr], { type: mime });
};

/**
 * Uploads an image to Firebase Storage and returns the public URL.
 * Handles both File objects and Base64 strings.
 * 
 * @param {File|String} image - The image file or base64 data to upload.
 * @param {string} folder - Optional folder path (default: 'uploads')
 * @returns {Promise<string>} - The uploaded image URL.
 */
export const uploadImage = async (image, folder = 'uploads') => {
    if (!image) {
        throw new Error("No se ha proporcionado ninguna imagen.");
    }

    try {
        let fileToUpload;
        let fileName;

        // Handle different image formats
        if (typeof image === 'string') {
            // Base64 string
            fileToUpload = base64ToBlob(image);
            fileName = generateFileName({ name: 'image.jpg' });
        } else if (image instanceof File || image instanceof Blob) {
            // File or Blob object
            fileToUpload = image;
            fileName = generateFileName(image);
        } else {
            throw new Error("Formato de imagen no soportado.");
        }

        // Create storage reference
        const storageRef = ref(storage, `${folder}/${fileName}`);

        // Upload file
        const snapshot = await uploadBytes(storageRef, fileToUpload);

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage Upload Error:", error);

        if (error.code === 'storage/unauthorized') {
            throw new Error("No tienes permisos para subir imágenes. Verifica las reglas de Storage.");
        }
        if (error.code === 'storage/canceled') {
            throw new Error("La subida fue cancelada.");
        }
        if (error.code === 'storage/unknown') {
            throw new Error("Error desconocido al subir la imagen. Inténtalo de nuevo.");
        }

        throw new Error(error.message || "Error al subir la imagen.");
    }
};

/**
 * Legacy alias for backward compatibility with existing code
 * @deprecated Use uploadImage instead
 */
export const uploadToImgBB = uploadImage;
