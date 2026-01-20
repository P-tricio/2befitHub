import React, { useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

/**
 * ImageUploadInput - Reusable input component for image URLs with ImgBB upload capability
 * @param {string} label - Optional label text
 * @param {string} value - Current URL value
 * @param {function} onChange - Callback when value changes
 * @param {string} placeholder - Placeholder text
 */
const ImageUploadInput = ({ label, value, onChange, placeholder }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                onChange(data.data.url);
            } else {
                alert('Error al subir imagen');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-w-0">
            {label && <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</label>}
            <div className="flex gap-2">
                <input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-blue-500 w-full"
                    placeholder={placeholder}
                />
                <label className={`w-12 h-10 shrink-0 rounded-xl flex items-center justify-center border cursor-pointer transition-colors ${uploading ? 'bg-slate-100 border-slate-200' : 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-600'}`}>
                    {uploading ? <Loader2 className="animate-spin text-slate-400" size={18} /> : <UploadCloud size={18} />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={uploading} />
                </label>
            </div>
        </div>
    );
};

export default ImageUploadInput;
