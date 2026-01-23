/**
 * Centralized service for handling image uploads via ImgBB
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/**
 * Uploads an image to ImgBB and returns the URL.
 * Handles both File objects and Base64 strings.
 * 
 * @param {File|String} image - The image file or base64 data to upload.
 * @returns {Promise<string>} - The uploaded image URL.
 */
export const uploadToImgBB = async (image) => {
    // 1. Validate API Key
    if (!IMGBB_API_KEY) {
        console.error("VITE_IMGBB_API_KEY is not defined in the environment.");
        throw new Error("Configuración del servidor incompleta (API Key faltante). Por favor, contacta con soporte.");
    }

    if (!image) {
        throw new Error("No se ha proporcionado ninguna imagen para subir.");
    }

    try {
        const formData = new FormData();

        // Handle different image formats
        if (typeof image === 'string') {
            // If it's a base64 string with the prefix, extract only the data part
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            formData.append('image', base64Data);
        } else {
            // It's a File object
            formData.append('image', image);
        }

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url;
        } else {
            console.error("ImgBB Upload Error Response:", data);
            const errorMsg = data.error?.message || "Error desconocido al procesar la imagen.";
            // Map common errors for better UX
            if (errorMsg.includes("Invalid API key")) {
                throw new Error("Error de configuración: API Key de imagen no válida.");
            }
            throw new Error(`Error de ImgBB: ${errorMsg}`);
        }
    } catch (error) {
        console.error("Upload Exception:", error);
        throw error.message ? error : new Error("Error de conexión al subir la imagen. Comprueba tu conexión a internet.");
    }
};
