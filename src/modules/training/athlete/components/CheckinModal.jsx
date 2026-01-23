import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Camera, Trash2, X, Check, Footprints, Clock, Flame, Zap, Scale, Ruler, Utensils, FileText, Dumbbell, History } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { uploadToImgBB } from '../../services/imageService';

const CheckinModal = ({ task, onClose, userId, targetDate, customMetrics = [] }) => {
    // Shared State
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');

    // Checkin / Tracking State
    const [weight, setWeight] = useState('');
    const [waist, setWaist] = useState('');
    const [hip, setHip] = useState('');
    const [photos, setPhotos] = useState({ front: null, side: null, back: null });
    const [photoUrls, setPhotoUrls] = useState({ front: null, side: null, back: null });
    const [uploading, setUploading] = useState(false);

    // Nutrition State
    const [habitsResults, setHabitsResults] = useState({}); // { habitName: true/false }

    // Custom Metrics State
    const [customValues, setCustomValues] = useState({});

    // NEAT / Activity State
    const [activityType, setActivityType] = useState('steps');
    const [duration, setDuration] = useState(task.config?.target || 0);
    const [rpe, setRpe] = useState(null);

    // Custom Form State
    const [formDefinition, setFormDefinition] = useState(null);
    const [formAnswers, setFormAnswers] = useState({});
    const [userMinimums, setUserMinimums] = useState({ nutrition: [], movement: [], health: [], uncategorized: [] });

    const normalizeMinimums = (m) => {
        const defaultStructure = { nutrition: [], movement: [], health: [], uncategorized: [] };
        if (!m) return defaultStructure;

        const raw = Array.isArray(m) ? { nutrition: m, movement: [], health: [], uncategorized: [] } : m;

        // Ensure every habit is an object { name, target }
        const result = { ...defaultStructure };
        Object.keys(result).forEach(key => {
            result[key] = (raw[key] || []).map(h =>
                typeof h === 'string' ? { name: h, target: 7 } : h
            );
        });
        return result;
    };

    // Determines the effective date for this checkin (Retroactive support)
    const isRetroactive = task.config?.retroactive === true;
    const effectiveDate = isRetroactive ? subDays(targetDate || new Date(), 1) : (targetDate || new Date());
    const dateKey = format(effectiveDate, 'yyyy-MM-dd');

    // Initial Load for Tracking Data
    useEffect(() => {
        const loadData = async () => {
            try {
                // Try to load historical data for this date
                const existing = await TrainingDB.tracking.getByDate(userId, dateKey);
                if (existing) {
                    if (existing.weight) setWeight(existing.weight);
                    if (existing.steps) {
                        setDuration(existing.steps);
                        setActivityType('steps');
                    }
                    if (existing.duration) {
                        setDuration(existing.duration);
                        setActivityType(existing.activityType || 'cardio');
                    }
                    if (existing.measurements) {
                        if (existing.measurements.waist) setWaist(existing.measurements.waist);
                        if (existing.measurements.hip) setHip(existing.measurements.hip);

                        const loadedCustoms = {};
                        customMetrics.forEach(metric => {
                            if (existing.measurements[metric]) {
                                loadedCustoms[metric] = existing.measurements[metric];
                            }
                        });
                        setCustomValues(loadedCustoms);
                    }
                    if (existing.photos) setPhotoUrls(existing.photos);
                    if (existing.habitsResults) setHabitsResults(existing.habitsResults);

                    const noteKey = `notes_${task.type}`;
                    if (existing[noteKey]) setNotes(existing[noteKey]);

                    if (existing.formAnswers) {
                        setFormAnswers(existing.formAnswers);
                    }
                }

                // If task has a formId, fetch form definition
                if (task.config?.formId) {
                    const form = await TrainingDB.forms.getById(task.config.formId);
                    setFormDefinition(form);
                }

                // If nutrition/habits OR neat, fetch user minimums
                if (task.type === 'nutrition' || task.type === 'neat') {
                    const snap = await TrainingDB.users.getAll();
                    const profile = snap.find(u => u.id === userId);
                    if (profile?.minimums) {
                        setUserMinimums(normalizeMinimums(profile.minimums));
                    }
                }
            } catch (e) { console.error(e); }
        };
        loadData();
    }, [userId, task.type, dateKey, customMetrics, task.config?.formId]);

    const handleImageSelect = (e, type) => {
        if (e.target.files && e.target.files[0]) {
            setPhotos(prev => ({ ...prev, [type]: e.target.files[0] }));
        }
    };

    const handleActivityTypeChange = (type) => {
        setActivityType(type);
        setDuration(0);
        setRpe(null);
    };

    const handleCustomMetricChange = (metric, value) => {
        setCustomValues(prev => ({
            ...prev,
            [metric]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let taskSummary = '';
            let taskResults = {};
            const updateData = { date: dateKey };

            if (task.type === 'neat') {
                updateData.activityType = activityType;
                if (activityType === 'steps') {
                    updateData.steps = parseInt(duration);
                    taskSummary = `${duration} pasos`;
                } else {
                    updateData.duration = parseInt(duration);
                    taskSummary = `${duration} min`;
                }
                taskResults = { duration, activityType };
                updateData.habitsResults = habitsResults;

                const selectedCategories = task.config?.categories || (task.config?.category ? [task.config.category] : []);
                let habitsToShow = [];

                if (selectedCategories.length > 0 && !selectedCategories.includes('general')) {
                    selectedCategories.forEach(cat => {
                        if (userMinimums[cat]) {
                            habitsToShow = [...habitsToShow, ...(userMinimums[cat] || [])];
                        }
                    });
                } else {
                    habitsToShow = [
                        ...(task.config?.habits || []),
                        ...userMinimums.nutrition,
                        ...userMinimums.movement,
                        ...userMinimums.health,
                        ...userMinimums.uncategorized
                    ];
                }
                habitsToShow = Array.from(new Set(habitsToShow));

                if (task.config?.isWeeklyReporting) {
                    let totalTargets = 0;
                    let totalDone = 0;
                    habitsToShow.forEach(h => {
                        const hName = typeof h === 'string' ? h : h.name;
                        const hTarget = typeof h === 'string' ? 7 : (h.target || 7);
                        totalTargets += hTarget;
                        totalDone += Math.min(parseInt(habitsResults[hName]) || 0, hTarget);
                    });
                    const percent = totalTargets > 0 ? Math.round((totalDone / totalTargets) * 100) : 0;
                    taskSummary = `Semana: ${percent}% de metas`;
                } else {
                    const doneCount = habitsToShow.filter(h => {
                        const hName = typeof h === 'string' ? h : h.name;
                        return habitsResults[hName] === true;
                    }).length;
                    const totalCount = habitsToShow.length;
                    taskSummary = `${doneCount}/${totalCount} hábitos`;
                }
                taskResults = { habitsResults };
            } else if (task.type === 'checkin' || task.type === 'tracking') {
                // Weight
                if (task.config?.weight !== false && weight) {
                    updateData.weight = parseFloat(weight);
                    taskSummary = `${weight} kg`;
                }

                // Metrics
                if (task.config?.metrics !== false) {
                    const measurements = {
                        waist: parseFloat(waist) || null,
                        hip: parseFloat(hip) || null
                    };
                    Object.entries(customValues).forEach(([key, val]) => {
                        if (val) measurements[key] = parseFloat(val) || val;
                    });

                    // Cleanup nulls
                    Object.keys(measurements).forEach(key => {
                        if (measurements[key] === null) delete measurements[key];
                    });

                    if (Object.keys(measurements).length > 0) {
                        updateData.measurements = measurements;
                        if (!taskSummary) taskSummary = `${Object.keys(measurements).length} medidas`;
                    }
                }

                // Photos
                let uploadedUrls = { ...photoUrls };
                if (task.config?.photos !== false) {
                    const uploadPromises = Object.entries(photos).map(async ([type, file]) => {
                        if (file) {
                            try {
                                const url = await uploadToImgBB(file);
                                return { type, url };
                            } catch (err) {
                                console.error(`Error uploading ${type} photo:`, err);
                                throw new Error(`Error al subir foto ${type}: ${err.message}`);
                            }
                        }
                        return null;
                    });

                    const results = await Promise.all(uploadPromises);
                    results.forEach(res => {
                        if (res) uploadedUrls[res.type] = res.url;
                    });

                    if (Object.values(uploadedUrls).some(u => u !== null)) {
                        updateData.photos = uploadedUrls;
                        if (!taskSummary) taskSummary = "Fotos registradas";
                    }
                }

                if (formDefinition) {
                    updateData.formAnswers = formAnswers;
                    if (!taskSummary) taskSummary = "Formulario completo";
                }
            } else if (task.type === 'free_training') {
                updateData.activityType = activityType;
                updateData.duration = parseInt(duration);
                updateData.rpe = rpe;
                taskSummary = `${duration} min • RPE ${rpe} • ${activityType === 'gym' ? 'Fuerza' : activityType === 'cardio' ? 'Cardio' : 'Otro'}`;
                taskResults = { duration, rpe, activityType };
            }

            if (task.type === 'checkin' || task.type === 'tracking') {
                taskResults = {
                    weight: updateData.weight || null,
                    measurements: updateData.measurements || null,
                    photos: updateData.photos || null,
                    formAnswers: updateData.formAnswers || null,
                    notes: notes || null
                };
            }

            if (task.type === 'neat' || task.type === 'nutrition' || task.type === 'free_training') {
                taskResults.notes = notes || null;
            }

            if (notes) updateData[`notes_${task.type}`] = notes;

            // Save to Tracking Collection
            await TrainingDB.tracking.addEntry(userId, updateData);

            // Sync summary to Task in User Schedule
            await TrainingDB.users.updateTaskInSchedule(userId, dateKey, task.id, {
                summary: taskSummary || "Completado",
                status: 'completed',
                results: taskResults,
                is_new: false
            });

            onClose(true);
        } catch (error) {
            console.error(error);
            alert('Error al guardar datos');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de querer eliminar esta tarea?')) return;
        try {
            const { _selectedDate, ...cleanTask } = task;
            await TrainingDB.users.removeTaskFromSchedule(userId, dateKey, cleanTask);
            onClose(true);
        } catch (e) {
            console.error(e);
            alert("Error al eliminar");
        }
    };

    const isNeat = task.type === 'neat';
    const isNutrition = task.type === 'nutrition';
    const isCheckin = task.type === 'checkin' || task.type === 'tracking';
    const isFreeTraining = task.type === 'free_training';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => onClose(false)}
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl z-[110] overflow-hidden max-h-[95vh] flex flex-col"
            >
                <div className="p-6 pb-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            {isNeat && 'Movimiento Extra'}
                            {isFreeTraining && 'Entrenamiento Libre'}
                            {isCheckin && 'Seguimiento'}
                            {isNutrition && (task.config?.categories ? `Hábitos: ${task.config.categories.join(' + ')}` : 'Seguimiento de Hábitos')}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium capitalize flex items-center gap-1">
                            {isRetroactive && <History size={12} className="text-orange-500" />}
                            {isRetroactive ? 'Reflexión: ' : ''}
                            {format(effectiveDate, 'EEEE dd MMMM', { locale: es })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!task.admin_assigned && (
                            <button onClick={handleDelete} className="p-2 bg-red-50 border border-red-100 rounded-full hover:bg-red-100 shadow-sm text-red-400">
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button onClick={() => onClose(false)} className="p-2 bg-white border border-slate-100 rounded-full hover:bg-slate-50 shadow-sm">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto">
                    {/* --- CATEGORIZED HABITS (Integrated) --- */}
                    {(isNeat || isNutrition) && (
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                                {isNeat ? 'Mínimos de Movimiento' : 'Hábitos de Hoy'}
                            </label>
                            <div className="grid grid-cols-1 gap-2">
                                {(() => {
                                    let selectedCategories = task.config?.categories || (task.config?.category ? [task.config.category] : []);

                                    // Default category for NEAT is movement
                                    if (isNeat && selectedCategories.length === 0) {
                                        selectedCategories = ['movement'];
                                    }

                                    let habitsToShow = [];
                                    if (selectedCategories.length > 0 && !selectedCategories.includes('general')) {
                                        selectedCategories.forEach(cat => {
                                            if (userMinimums[cat]) {
                                                habitsToShow = [...habitsToShow, ...(userMinimums[cat] || [])];
                                            }
                                        });
                                    } else {
                                        habitsToShow = [
                                            ...(task.config?.habits || []),
                                            ...userMinimums.nutrition,
                                            ...userMinimums.movement,
                                            ...userMinimums.health,
                                            ...userMinimums.uncategorized
                                        ];
                                    }
                                    return Array.from(new Set(habitsToShow)).map(habit => {
                                        const habitName = typeof habit === 'string' ? habit : habit.name;
                                        const habitTarget = typeof habit === 'string' ? 7 : (habit.target || 7);
                                        const status = habitsResults[habitName];
                                        const isWeekly = task.config?.isWeeklyReporting;

                                        if (isWeekly) {
                                            const daysCount = parseInt(status) || 0;
                                            const isGoalMet = daysCount >= habitTarget;
                                            return (
                                                <div key={habitName} className="p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm space-y-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-sm text-slate-900">{habitName}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Meta: {habitTarget} {habitTarget === 1 ? 'día' : 'días'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isGoalMet && <div className="p-1 bg-emerald-500 text-white rounded-full"><Check size={10} strokeWidth={4} /></div>}
                                                            <span className={`text-xl font-black ${isGoalMet ? 'text-emerald-500' : 'text-indigo-600'}`}>{daysCount}<span className="text-[10px] text-slate-300 ml-1">días</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between gap-1">
                                                        {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                                                            <button
                                                                key={num}
                                                                onClick={() => setHabitsResults(prev => ({ ...prev, [habitName]: num }))}
                                                                className={`flex-1 h-10 rounded-xl font-bold text-xs transition-all ${daysCount === num ? 'bg-indigo-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <button
                                                key={habitName}
                                                onClick={() => {
                                                    setHabitsResults(prev => {
                                                        const current = prev[habitName];
                                                        if (current === true) return { ...prev, [habitName]: false };
                                                        if (current === false) return { ...prev, [habitName]: null };
                                                        return { ...prev, [habitName]: true };
                                                    });
                                                }}
                                                className={`flex items-center justify-between p-4 rounded-3xl border transition-all 
                                                    ${status === true ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-md ring-1 ring-emerald-200' : ''}
                                                    ${status === false ? 'bg-red-50 border-red-200 text-red-700 shadow-md ring-1 ring-red-200' : ''}
                                                    ${status === null || status === undefined ? 'bg-white border-slate-100 text-slate-500' : ''}
                                                `}
                                            >
                                                <span className="font-black text-sm">{habitName}</span>
                                                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all 
                                                    ${status === true ? 'bg-emerald-500 border-emerald-500 text-white scale-110' : ''}
                                                    ${status === false ? 'bg-red-500 border-red-200 text-white scale-110' : ''}
                                                    ${status === null || status === undefined ? 'border-slate-200' : ''}
                                                `}>
                                                    {status === true && <Check size={16} strokeWidth={4} />}
                                                    {status === false && <X size={16} strokeWidth={4} />}
                                                </div>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    )}

                    {/* --- NEAT / ACTIVITY FORM --- */}
                    {isNeat && (
                        <div className="space-y-8">
                            <div className="flex gap-2">
                                {[
                                    { id: 'steps', label: 'Pasos', icon: <Footprints size={20} /> },
                                    { id: 'time', label: 'Tiempo (min)', icon: <Clock size={20} /> }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => handleActivityTypeChange(type.id)}
                                        className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-3xl border-2 transition-all ${activityType === type.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                        {type.icon}
                                        <span className="text-[10px] font-black uppercase tracking-wider">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registrar</span>
                                    <span className="text-4xl font-black text-slate-900">{duration} <span className="text-base text-slate-400 font-bold">{activityType === 'steps' ? 'pasos' : 'min'}</span></span>
                                </div>
                                <input
                                    type="range"
                                    min={activityType === 'steps' ? "0" : "5"}
                                    max={activityType === 'steps' ? "30000" : "180"}
                                    step={activityType === 'steps' ? "500" : "5"}
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value))}
                                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* --- FREE TRAINING FORM --- */}
                    {isFreeTraining && (
                        <div className="space-y-8">
                            <div className="flex gap-2">
                                {[
                                    { id: 'gym', label: 'Fuerza', icon: <Dumbbell size={20} /> },
                                    { id: 'cardio', label: 'Cardio', icon: <Flame size={20} /> },
                                    { id: 'other', label: 'Otros', icon: <Zap size={20} /> }
                                ].map(type => (
                                    <button
                                        key={type.id}
                                        onClick={() => {
                                            setActivityType(type.id);
                                            if (type.id !== activityType) {
                                                setDuration(0);
                                                setRpe(null);
                                            }
                                        }}
                                        className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-3xl border-2 transition-all ${activityType === type.id ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                                    >
                                        {type.icon}
                                        <span className="text-[10px] font-black uppercase tracking-wider">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4 px-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración</span>
                                    <span className="text-4xl font-black text-slate-900">{duration} <span className="text-base text-slate-400 font-bold">min</span></span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="180"
                                    step="5"
                                    value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value))}
                                    className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-4 px-1">
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Esfuerzo (RPE)</span>
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                                            {rpe === 0 ? 'Descanso' :
                                                rpe <= 2 ? 'Muy Fácil' :
                                                    rpe <= 4 ? 'Fácil' :
                                                        rpe <= 6 ? 'Moderado' :
                                                            rpe <= 8 ? 'Duro' :
                                                                rpe === 9 ? 'Muy Duro' :
                                                                    rpe === 10 ? 'Máximo' : '-'}
                                        </span>
                                    </div>
                                    <span className="text-4xl font-black text-slate-900">{rpe !== null ? rpe : '-'}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="10"
                                    step="1"
                                    value={rpe || 0}
                                    onChange={e => setRpe(parseInt(e.target.value))}
                                    className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-500"
                                />
                                <div className="flex justify-between mt-2 px-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                    <span>Muy Suave</span>
                                    <span>Moderado</span>
                                    <span>Máximo</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- CHECKIN & TRACKING FORM --- */}
                    {isCheckin && (
                        <div className="space-y-10">
                            {(task.config?.weight !== false) && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Peso Corporal</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={weight}
                                            onChange={e => setWeight(e.target.value)}
                                            placeholder="00.0"
                                            className="w-full text-7xl font-black text-slate-900 bg-transparent border-b-4 border-slate-50 focus:border-slate-900 outline-none pb-4 placeholder:text-slate-100 tracking-tighter"
                                        />
                                        <span className="absolute right-0 bottom-6 text-2xl font-black text-slate-300">kg</span>
                                    </div>
                                </div>
                            )}

                            {task.config?.photos !== false && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Progreso Visual</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['front', 'side', 'back'].map((side) => (
                                            <label key={side} className="aspect-[3/4.5] rounded-3xl border-2 border-dashed border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all flex flex-col items-center justify-center cursor-pointer relative overflow-hidden bg-white shadow-sm active:scale-95">
                                                {photos[side] ? (
                                                    <img
                                                        src={URL.createObjectURL(photos[side])}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                    />
                                                ) : photoUrls[side] ? (
                                                    <img
                                                        src={photoUrls[side]}
                                                        className="absolute inset-0 w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                            <Camera size={20} />
                                                        </div>
                                                        <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest">
                                                            {side === 'front' ? 'Frente' : side === 'side' ? 'Perfil' : 'Espalda'}
                                                        </span>
                                                    </div>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handleImageSelect(e, side)}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {task.config?.metrics !== false && (
                                <div className="pt-4">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Biometría (cm)</label>
                                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-slate-300 uppercase pl-1">Cintura</label>
                                            <input
                                                type="number"
                                                value={waist}
                                                onChange={e => setWaist(e.target.value)}
                                                className="w-full text-4xl font-black text-slate-900 bg-transparent border-b-2 border-slate-50 focus:border-slate-900 outline-none py-2 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-black text-slate-300 uppercase pl-1">Cadera</label>
                                            <input
                                                type="number"
                                                value={hip}
                                                onChange={e => setHip(e.target.value)}
                                                className="w-full text-4xl font-black text-slate-900 bg-transparent border-b-2 border-slate-50 focus:border-slate-900 outline-none py-2 transition-colors"
                                            />
                                        </div>
                                        {customMetrics.map((metric) => (
                                            <div key={metric} className="space-y-1">
                                                <label className="block text-[10px] font-black text-slate-300 uppercase pl-1">{metric}</label>
                                                <input
                                                    type="number"
                                                    value={customValues[metric] || ''}
                                                    onChange={e => handleCustomMetricChange(metric, e.target.value)}
                                                    className="w-full text-4xl font-black text-slate-900 bg-transparent border-b-2 border-slate-50 focus:border-slate-900 outline-none py-2 transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Custom Form Runner */}
                            {formDefinition && (
                                <div className="pt-10 border-t border-slate-50 space-y-8">
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{formDefinition.name}</h4>
                                        {formDefinition.description && <p className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-widest">{formDefinition.description}</p>}
                                    </div>

                                    <div className="space-y-6">
                                        {formDefinition.fields?.map(field => (
                                            <div key={field.id} className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{field.label}</label>

                                                {field.type === 'text' && (
                                                    <input
                                                        type="text"
                                                        value={formAnswers[field.id] || ''}
                                                        onChange={e => setFormAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-slate-800 font-bold outline-none focus:border-slate-900 transition-colors"
                                                        placeholder="Tu respuesta..."
                                                    />
                                                )}

                                                {field.type === 'number' && (
                                                    <input
                                                        type="number"
                                                        value={formAnswers[field.id] || ''}
                                                        onChange={e => setFormAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-slate-800 font-bold outline-none focus:border-slate-900 transition-colors"
                                                        placeholder="0"
                                                    />
                                                )}

                                                {field.type === 'boolean' && (
                                                    <div className="flex gap-2">
                                                        {['Sí', 'No'].map(opt => (
                                                            <button
                                                                key={opt}
                                                                onClick={() => setFormAnswers(prev => ({ ...prev, [field.id]: opt }))}
                                                                className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest border transition-all ${formAnswers[field.id] === opt ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
                                                            >
                                                                {opt}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {field.type === 'select' && (
                                                    <select
                                                        value={formAnswers[field.id] || ''}
                                                        onChange={e => setFormAnswers(prev => ({ ...prev, [field.id]: e.target.value }))}
                                                        className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.8rem] text-slate-800 font-black outline-none appearance-none"
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {field.options?.split(',').map(opt => (
                                                            <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- SHARED NOTES --- */}
                    <div className="pt-4">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Observaciones Extra</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="¿Algún comentario para tu entrenador?"
                            className="w-full p-5 bg-slate-50 rounded-[1.8rem] text-sm font-bold text-slate-700 outline-none h-28 border border-slate-50 focus:border-slate-200 transition-colors resize-none"
                        />
                    </div>
                </div>

                <div className="p-8 pt-4 shrink-0 bg-white border-t border-slate-50">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`w-full py-5 text-white rounded-[2rem] font-black text-lg hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50 shadow-2xl flex items-center justify-center gap-3 ${isNeat ? 'bg-emerald-500 shadow-emerald-500/30' :
                            isNutrition ? 'bg-orange-500 shadow-orange-500/30' :
                                isFreeTraining ? 'bg-indigo-500 shadow-indigo-500/30' :
                                    'bg-slate-900 shadow-slate-900/30'
                            }`}
                    >
                        {saving ? (
                            <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={20} strokeWidth={4} />
                                CONFIRMAR REGISTRO
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CheckinModal;
