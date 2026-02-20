/**
 * Centralized service for handling file uploads via Firebase Storage.
 * Supports images, audio, and general documents.
 */

import { storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Generates a unique filename while preserving extension
 */
const generateFileName = (file) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const originalName = file.name || 'file';
    const extension = originalName.split('.').pop() || 'bin';
    return `${timestamp}_${random}.${extension}`;
};

/**
 * Base64 to Blob helper
 */
const base64ToBlob = (base64, mimeType = 'image/jpeg') => {
    const parts = base64.includes(',') ? base64.split(',') : [null, base64];
    const actualMime = mimeType || (parts[0] ? parts[0].match(/:(.*?);/)?.[1] : 'image/jpeg');
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: actualMime });
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Compresses an image using Canvas
 */
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
    });
};

/**
 * Uploads any file to Firebase Storage
 * 
 * @param {File|Blob|String} fileData - The file, blob or base64 data
 * @param {string} folder - 'messages', 'evidence', etc.
 * @returns {Promise<string>} - The download URL
 */
export const uploadFile = async (fileData, folder = 'uploads') => {
    if (!fileData) throw new Error("No se ha proporcionado ningún archivo.");

    // Size check
    if (fileData.size && fileData.size > MAX_FILE_SIZE) {
        throw new Error("El archivo es demasiado grande (máximo 50MB).");
    }

    try {
        let fileToUpload;
        let fileName;

        if (typeof fileData === 'string') {
            fileToUpload = base64ToBlob(fileData);
            fileName = generateFileName({ name: 'upload.jpg' });
        } else {
            // Compress if it's an image
            if (fileData.type?.startsWith('image/') && !(fileData.type?.includes('gif'))) {
                fileToUpload = await compressImage(fileData);
            } else {
                fileToUpload = fileData;
            }
            fileName = generateFileName(fileData);
        }

        const storageRef = ref(storage, `${folder}/${fileName}`);
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        const downloadURL = await getDownloadURL(snapshot.ref);

        return downloadURL;
    } catch (error) {
        console.error("Storage Upload Error:", error);
        throw new Error(error.message || "Error al subir el archivo.");
    }
};

/**
 * Backward compatibility alias
 */
export const uploadImage = uploadFile;
export const uploadToImgBB = uploadFile;
