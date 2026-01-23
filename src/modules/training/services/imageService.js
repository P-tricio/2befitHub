/**
 * Centralized service for handling image uploads via ImgBB
 */

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY?.trim();

// Diagnostic log (masking the key for security)
if (IMGBB_API_KEY) {
    console.log(`[imageService] API Key detected: ${IMGBB_API_KEY.slice(0, 4)}...${IMGBB_API_KEY.slice(-4)}`);
} else {
    console.warn("[imageService] API Key NOT detected. Check your .env file.");
}

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
        throw new Error("Configuración del servidor incompleta (API Key faltante).");
    }

    if (!image) {
        throw new Error("No se ha proporcionado ninguna imagen.");
    }

    try {
        const formData = new FormData();

        // Handle different image formats
        if (typeof image === 'string') {
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            formData.append('image', base64Data);
        } else {
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
            const errorMsg = data.error?.message || "Error desconocido.";

            if (errorMsg.toLowerCase().includes("invalid api key")) {
                throw new Error("La API Key de ImgBB no es válida. Revisa la consola.");
            }
            throw new Error(`Error de ImgBB: ${errorMsg}`);
        }
    } catch (error) {
        console.error("Upload Exception:", error);
        throw error;
    }
};
