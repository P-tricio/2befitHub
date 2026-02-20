import React, { useState, useEffect } from 'react';
import { X, Save, AlignLeft, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ImageUploadInput from './ImageUploadInput';
import { ExerciseAPI } from '../../services/exerciseApi';
// Removed direct useUnsavedChanges to avoid blocker conflicts
// import { useUnsavedChanges } from '../../../../hooks/useUnsavedChanges';

import { PATTERNS, LEVELS, EQUIPMENT, QUALITIES, MUSCLE_GROUPS } from '../constants';

const DEFAULT_FORM_DATA = {
    name: '',
    group: '',
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
    primaryMuscle: '',
    secondaryMuscles: [],
    loadable: false,
    isWarmup: false
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
    groups = [], // NEW PROP: List of available groups
    onSave,
    onClose,
    onDirtyChange, // NEW PROP: Notify parent about dirty state
    title
}) => {
    const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
    const [isSaving, setIsSaving] = useState(false);
    const [tagInput, setTagInput] = useState('');


    // Track dirty state
    const [isDirty, setIsDirty] = useState(false);
    const [initialState, setInitialState] = useState(null);

    // Initialize/Reset State
    useEffect(() => {
        if (isOpen) {
            const startData = exercise ? {
                name: exercise.name || '',
                group: exercise.group || '',
                pattern: exercise.pattern || 'Squat',
                level: exercise.level || 'Intermedio',
                quality: exercise.quality || 'F',
                equipment: exercise.equipment || 'Ninguno (Peso Corporal)',
                mediaUrl: exercise.mediaUrl || exercise.gifUrl || '',
                imageStart: exercise.imageStart || '',
                imageEnd: exercise.imageEnd || '',
                youtubeUrl: exercise.youtubeUrl || '',
                description: exercise.description || '',
                tags: exercise.tags || [],
                primaryMuscle: exercise.primaryMuscle || '',
                secondaryMuscles: exercise.secondaryMuscles || [],
                loadable: exercise.loadable || false,
                isWarmup: exercise.isWarmup || false
            } : DEFAULT_FORM_DATA;

            setFormData(startData);
            setTagInput((startData.tags || []).join(', '));
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
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70]"
                        onClick={handleCloseSafe}
                    />
                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[80] flex flex-col h-full overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 shrink-0">
                            <h2 className="text-xl font-bold text-slate-900">
                                {title || (exercise ? 'Editar Ejercicio' : 'Nuevo Ejercicio')}
                            </h2>
                            <button
                                onClick={handleCloseSafe}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Form Area */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            <form id="exercise-form" onSubmit={handleSubmit} className="flex flex-col gap-5 pb-20">
                                {/* Name Input */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-slate-300 focus:bg-white transition-all"
                                        placeholder="Ej: Sentadilla Trasera"
                                    />
                                </div>

                                {/* Group Selector */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Grupo (Opcional)</label>
                                    <select
                                        value={formData.group}
                                        onChange={e => setFormData({ ...formData, group: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                    >
                                        <option value="">Sin agrupar</option>
                                        {/* Ensure current group is always an option even if not in the list */}
                                        {formData.group && !groups.some(g => g.name === formData.group) && (
                                            <option value={formData.group}>{formData.group}</option>
                                        )}
                                        {groups.map(g => (
                                            <option key={g.id || g.name} value={g.name}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Pattern & Equipment (Grid) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Patrón</label>
                                        <select
                                            value={formData.pattern}
                                            onChange={e => setFormData({ ...formData, pattern: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                        >
                                            {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Equipamiento</label>
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px]">
                                            {EQUIPMENT.map(eq => {
                                                const isSelected = (formData.equipment || []).includes(eq);
                                                return (
                                                    <button
                                                        key={eq}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = formData.equipment || [];
                                                            const updated = isSelected ? current.filter(e => e !== eq) : [...current, eq];
                                                            setFormData({ ...formData, equipment: updated });
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {eq}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Muscle Targets (Grid) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Músculo Primario</label>
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px]">
                                            {MUSCLE_GROUPS.map(m => {
                                                const isSelected = formData.primaryMuscle === m;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, primaryMuscle: isSelected ? '' : m })}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Músculos Secundarios</label>
                                        <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl min-h-[100px]">
                                            {MUSCLE_GROUPS.map(m => {
                                                const isSelected = (formData.secondaryMuscles || []).includes(m);
                                                const isPrimary = m === formData.primaryMuscle;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        disabled={isPrimary}
                                                        onClick={() => {
                                                            const current = formData.secondaryMuscles || [];
                                                            const updated = isSelected ? current.filter(x => x !== m) : [...current, m];
                                                            setFormData({ ...formData, secondaryMuscles: updated });
                                                        }}
                                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${isSelected
                                                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                                                            : isPrimary
                                                                ? 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed'
                                                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Level & Quality (Grid) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Nivel</label>
                                        <select
                                            value={formData.level}
                                            onChange={e => setFormData({ ...formData, level: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                        >
                                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Cualidad (FEMC)</label>
                                        <select
                                            value={formData.quality}
                                            onChange={e => setFormData({ ...formData, quality: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                        >
                                            {QUALITIES.map(q => <option key={q.id} value={q.id}>{q.id} - {q.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Loadable Checkbox */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-bold text-slate-700">⚖️ Peso Externo</label>
                                        <span className="text-[10px] text-slate-400 font-medium">Usa barras, mancuernas, etc.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        id="loadable-checkbox-drawer"
                                        checked={formData.loadable || false}
                                        onChange={e => setFormData({ ...formData, loadable: e.target.checked })}
                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Warmup/Cooldown Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-bold text-slate-700">🔥 Calentamiento / Enfriamiento</label>
                                        <span className="text-[10px] text-slate-400 font-medium">Marca este ejercicio como preparatorio o vuelta a la calma.</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.isWarmup || false}
                                        onChange={e => setFormData({ ...formData, isWarmup: e.target.checked })}
                                        className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                                    />
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Instrucciones / Notas</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-slate-300 focus:bg-white text-xs resize-none h-24"
                                        placeholder="Detalles sobre la ejecución..."
                                    />
                                </div>

                                {/* Media Section */}
                                <div className="space-y-4 pt-2">
                                    <ImageUploadInput
                                        label="Media URL"
                                        value={formData.mediaUrl}
                                        onChange={(val) => setFormData(prev => ({ ...prev, mediaUrl: val }))}
                                        placeholder="URL imagen/GIF..."
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <ImageUploadInput
                                            label="Inicio"
                                            value={formData.imageStart}
                                            onChange={(val) => setFormData(prev => ({ ...prev, imageStart: val }))}
                                            placeholder="Foto inicio"
                                        />
                                        <ImageUploadInput
                                            label="Fin"
                                            value={formData.imageEnd}
                                            onChange={(val) => setFormData(prev => ({ ...prev, imageEnd: val }))}
                                            placeholder="Foto fin"
                                        />
                                    </div>

                                    {/* Simplified Preview */}
                                    <div className="aspect-video bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                                        {getPreviewImage() ? (
                                            <img
                                                src={getPreviewImage()}
                                                alt="Preview"
                                                className="w-full h-full object-contain"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Preview</span>
                                        )}
                                    </div>
                                </div>

                                {/* YouTube & Tags */}
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">YouTube Video</label>
                                        <input
                                            type="url"
                                            value={formData.youtubeUrl}
                                            onChange={e => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                                            placeholder="https://youtube.com/..."
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Etiquetas (Tags)</label>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setTagInput(val);
                                                // Sync with formData but only filter empty ones on save or debounced?
                                                // Let's keep it simple: sync on change but handle the comma gracefully
                                                const tagArray = val.split(',').map(t => t.trim()).filter(Boolean);
                                                setFormData(prev => ({ ...prev, tags: tagArray }));
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                                            placeholder="Ej: bíceps, secundario"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer Action */}
                        <div className="px-6 py-5 border-t border-slate-100 bg-white sticky bottom-0 z-20">
                            <button
                                type="submit"
                                form="exercise-form"
                                disabled={isSaving}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} />
                                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </motion.div >
                </>
            )}
        </AnimatePresence >
    );
};

export default ExerciseFormDrawer;
export { PATTERNS, LEVELS, EQUIPMENT, QUALITIES, DEFAULT_FORM_DATA };
