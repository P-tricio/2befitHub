/**
 * Centralized service for handling image uploads via ImgBB
 */

// Direct access to Vite env variables
const getApiKey = () => {
    const key = import.meta.env.VITE_IMGBB_API_KEY;
    return key ? String(key).trim() : null;
};

// Remove diagnostic log for security
/**
 * Uploads an image to ImgBB and returns the URL.
 * Handles both File objects and Base64 strings.
 * 
 * @param {File|String} image - The image file or base64 data to upload.
 * @returns {Promise<string>} - The uploaded image URL.
 */
export const uploadToImgBB = async (image) => {
    const apiKey = getApiKey();

    // 1. Validate API Key
    if (!apiKey) {
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

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();

        if (data.success) {
            return data.data.url;
        } else {
            console.error("ImgBB Error Response:", data);
            const errorMsg = data.error?.message || "Error desconocido.";

            if (errorMsg.toLowerCase().includes("invalid api key")) {
                throw new Error("La API Key de ImgBB es inválida. Revisa tu archivo .env y asegúrate de que sea la clave correcta (4ebc...629).");
            }
            if (errorMsg.toLowerCase().includes("file too large")) {
                throw new Error("La imagen es demasiado grande para ImgBB (máx 32MB).");
            }
            throw new Error(`Error de ImgBB: ${errorMsg}`);
        }
    } catch (error) {
        console.error("Upload Exception Details:", error);
        throw error;
    }
};
