import React, { useState, useEffect } from 'react';
import { X, Save, AlignLeft, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploadInput from './ImageUploadInput';
import { ExerciseAPI } from '../../services/exerciseApi';
// Removed direct useUnsavedChanges to avoid blocker conflicts
// import { useUnsavedChanges } from '../../../../hooks/useUnsavedChanges';

import { PATTERNS, LEVELS, EQUIPMENT, QUALITIES } from '../constants';

const DEFAULT_FORM_DATA = {
    name: '',
    pattern: 'Squat',
    level: 'Intermedio',
    quality: 'F',
    equipment: 'Ninguno (Peso Corporal)',
    mediaUrl: '',
    imageStart: '',
    imageEnd: '',
    youtubeUrl: '',
    description: '',
    tags: [],
    loadable: false
};

/**
 * ExerciseFormDrawer - Reusable slide-in drawer for creating/editing exercises
 * 
 * @param {boolean} isOpen - Whether the drawer is visible
 * @param {object} exercise - Existing exercise data (null for new)
 * @param {function} onSave - Callback with form data when saved
 * @param {function} onClose - Callback when drawer is closed
 * @param {string} title - Optional custom title
 */
const ExerciseFormDrawer = ({
    isOpen,
    exercise = null,
    onSave,
    onClose,
    onDirtyChange, // NEW PROP: Notify parent about dirty state
    title
}) => {
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [isSaving, setIsSaving] = useState(false);


    // Track dirty state
    const [isDirty, setIsDirty] = useState(false);
    const [initialState, setInitialState] = useState(null);

    // Initialize/Reset State
    useEffect(() => {
        if (isOpen) {
            const startData = exercise ? {
                name: exercise.name || '',
                pattern: exercise.pattern || 'Squat',
                level: exercise.level || 'Intermedio',
                quality: exercise.quality || 'F',
                equipment: exercise.equipment || 'Ninguno (Peso Corporal)',
                mediaUrl: exercise.mediaUrl || '',
                imageStart: exercise.imageStart || '',
                imageEnd: exercise.imageEnd || '',
                youtubeUrl: exercise.youtubeUrl || '',
                description: exercise.description || '',
                tags: exercise.tags || [],
                loadable: exercise.loadable || false
            } : DEFAULT_FORM_DATA;

            setFormData(startData);
            setInitialState(JSON.stringify(startData));
            setIsDirty(false);
        }
    }, [exercise, isOpen]);

    // Check Dirty & Notify Parent
    useEffect(() => {
        if (!isOpen || !initialState) {
            setIsDirty(false);
            if (onDirtyChange) onDirtyChange(false);
            return;
        }

        const dirty = JSON.stringify(formData) !== initialState;
        setIsDirty(dirty);
        if (onDirtyChange) onDirtyChange(dirty);

    }, [formData, isOpen, initialState, onDirtyChange]);

    // useUnsavedChanges(isDirty && isOpen); // REMOVED: Parent handles blocking now

    const handleCloseSafe = () => {
        if (isDirty) {
            if (window.confirm('Tienes cambios sin guardar. ¿Seguro que quieres cerrar?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        setIsSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving exercise:', error);
            alert('Error al guardar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Get preview image
    const getPreviewImage = () => {
        if (formData.mediaUrl) return formData.mediaUrl;
        if (formData.imageStart) return formData.imageStart;
        if (formData.youtubeUrl) return ExerciseAPI.getYoutubeThumbnail(formData.youtubeUrl);
        return null;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
                        onClick={handleCloseSafe}
                    />
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col h-full"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
                            <h2 className="text-2xl font-black text-slate-900">
                                {title || (exercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio')}
                            </h2>
                            <button onClick={handleCloseSafe} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Form Area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            <form id="exercise-form" onSubmit={handleSubmit} className="flex flex-col gap-6 pb-20">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 border-2 border-transparent focus:border-emerald-500 outline-none transition-all"
                                        placeholder="Ej: Sentadilla Trasera"
                                    />
                                </div>

                                {/* Pattern */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patrón de Movimiento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {PATTERNS.map(p => (
                                            <button
                                                key={p}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, pattern: p })}
                                                className={`p-3 rounded-lg text-sm font-bold border-2 transition-all ${formData.pattern === p
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Equipment */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Equipamiento</label>
                                    <select
                                        value={formData.equipment}
                                        onChange={e => setFormData({ ...formData, equipment: e.target.value })}
                                        className="w-full p-4 bg-slate-50 rounded-xl font-bold text-slate-900 border-2 border-transparent focus:border-emerald-500 outline-none transition-all"
                                    >
                                        {EQUIPMENT.map(eq => (
                                            <option key={eq} value={eq}>{eq}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Level */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nivel de Dificultad</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {LEVELS.map(l => (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, level: l })}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold border-2 whitespace-nowrap transition-all ${formData.level === l
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Quality */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cualidad Física (FEMC)</label>
                                    <div className="flex gap-2">
                                        {QUALITIES.map(q => (
                                            <button
                                                key={q.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, quality: q.id })}
                                                className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${formData.quality === q.id
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                {q.id} - {q.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Loadable Checkbox - Peso Externo */}
                                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-transparent hover:border-slate-100 transition-all">
                                    <input
                                        type="checkbox"
                                        id="loadable-checkbox-drawer"
                                        checked={formData.loadable || false}
                                        onChange={e => setFormData({ ...formData, loadable: e.target.checked })}
                                        className="w-5 h-5 text-emerald-600 bg-white border-slate-300 rounded-lg focus:ring-emerald-500 focus:ring-2 transition-all cursor-pointer"
                                    />
                                    <label htmlFor="loadable-checkbox-drawer" className="flex-1 cursor-pointer">
                                        <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                                            ⚖️ Ejercicio con Peso Externo
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 leading-tight">
                                            Marca si usa barras, mancuernas, kettlebells o máquinas con peso ajustable.
                                        </p>
                                    </label>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <AlignLeft size={16} /> Descripción Técnica
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-700 border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-sm resize-none"
                                        placeholder="Detalles sobre la ejecución..."
                                    />
                                </div>

                                {/* Media Section */}
                                <div className="space-y-4">
                                    {/* GIF URL / Image Upload */}
                                    <div className="mb-4">
                                        <ImageUploadInput
                                            label="URL del GIF / Imagen (Principal)"
                                            value={formData.mediaUrl}
                                            onChange={(val) => setFormData(prev => ({ ...prev, mediaUrl: val }))}
                                            placeholder="https://... (o subir foto)"
                                        />
                                    </div>

                                    {/* Auto-GIF Photos */}
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-1">Auto-GIF (Inicio / Fin)</p>
                                        </div>
                                        <div>
                                            <ImageUploadInput
                                                label=""
                                                value={formData.imageStart}
                                                onChange={(val) => setFormData(prev => ({ ...prev, imageStart: val }))}
                                                placeholder="Foto Inicio"
                                            />
                                        </div>
                                        <div>
                                            <ImageUploadInput
                                                label=""
                                                value={formData.imageEnd}
                                                onChange={(val) => setFormData(prev => ({ ...prev, imageEnd: val }))}
                                                placeholder="Foto Fin"
                                            />
                                        </div>
                                    </div>

                                    {/* Preview container */}
                                    <div className="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {getPreviewImage() ? (
                                            <img
                                                src={getPreviewImage()}
                                                alt="Preview"
                                                className="w-full h-full object-contain mix-blend-multiply"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        ) : (
                                            <span className="text-xs text-slate-400">Vista previa del ejercicio</span>
                                        )}
                                    </div>
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        Etiquetas (Tags) - Separa con comas
                                    </label>
                                    <input
                                        type="text"
                                        value={(formData.tags || []).join(', ')}
                                        onChange={e => setFormData({ ...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                        className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-700 border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-sm"
                                        placeholder="Ej: bíceps, secundario, hipertrofia"
                                    />
                                </div>

                                {/* YouTube URL */}
                                <div>
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                        <Video size={16} /> URL Video Youtube (Explicativo)
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.youtubeUrl}
                                        onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                        className="w-full p-4 bg-slate-50 rounded-xl font-medium text-slate-700 border-2 border-transparent focus:border-emerald-500 outline-none transition-all text-sm"
                                        placeholder="https://youtube.com/..."
                                    />
                                </div>

                                {/* Footer Actions */}
                                <div className="p-6 pb-24 lg:pb-6 border-t border-slate-100 bg-white shrink-0">
                                    <button
                                        type="submit"
                                        form="exercise-form"
                                        disabled={isSaving}
                                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={20} />
                                        {isSaving ? 'Guardando...' : 'Guardar Ejercicio'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div >
                </>
            )}
        </AnimatePresence >
    );
};

export default ExerciseFormDrawer;
export { PATTERNS, LEVELS, EQUIPMENT, QUALITIES, DEFAULT_FORM_DATA };
