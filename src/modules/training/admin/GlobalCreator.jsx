import React, { useState, useEffect, useMemo } from 'react';
import {
    MoreVertical, Plus, Copy, Trash2, ChevronDown, ChevronUp, ChevronRight,
    Link, Link2, Move, Clock, Repeat, Flame, Dumbbell, Footprints, Edit2,
    Settings, Eye, Check, X, Search, Lock, Unlock, Save, Download, Coffee, Filter, UploadCloud, Loader2, Zap, Library, List, ClipboardList, Info,
    Type, Target, Activity, Hash, Video, Tag, FileText, GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { TrainingDB } from '../services/db';
import { ExerciseAPI } from '../services/exerciseApi';
import ActionMenu from '../../../components/admin/ActionMenu';
import { ImageUploadInput, ExerciseCard, ExerciseFormDrawer, ExerciseBrowser, getPatternColor } from './components';
import { uploadToImgBB } from '../services/imageService';
import ExerciseMedia from '../components/ExerciseMedia';
import SessionPreviewModal from './SessionPreviewModal';
import { PATTERNS, EQUIPMENT, LEVELS, QUALITIES } from './constants';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

// Nutrition Imports
import FoodLibrary from '../../nutrition/admin/FoodLibrary';
import RecipeEditor from '../../nutrition/admin/RecipeEditor';
import DayEditor from '../../nutrition/admin/DayEditor';
import { NutritionDB } from '../../nutrition/services/nutritionDB';
import { Utensils, ChefHat, Calendar } from 'lucide-react'; // Ensure icons are available

// --- Sub-components ---
const isResistanceExercise = (ex, isSessionCardio = false) => {
    if (isSessionCardio) return true; // Global trigger: if session is cardio, all exercises can have cardio units
    if (!ex) return false;

    // Explicit override in config
    if (ex.config?.forceCardio) return true;

    const q = (ex.quality || '').toUpperCase();
    const qs = (ex.qualities || []).map(tag => tag.toUpperCase());
    const cardioTags = ['E', 'ENERGÍA', 'CARDIO', 'RESISTENCIA', 'C'];
    const isRes = cardioTags.includes(q) || qs.some(tag => cardioTags.includes(tag));

    const name = (ex.name_es || ex.name || '').toLowerCase();
    const cardioKeywords = ['ciclismo', 'carrera', 'running', 'bike', 'elíptica', 'remo', 'row', 'natación', 'swim', 'cardio', 'walking'];
    const isKeywordMatch = cardioKeywords.some(kw => name.includes(kw));

    return isRes || isKeywordMatch;
};

// ExerciseItem Component
const ExerciseItem = ({ ex, idx, isGrouped, isFirstInGroup, isLastInGroup, onConfigure, onRemove, onDuplicate, onSwap, onToggleGroup, isLinkMode, nextIsGrouped, onUpdateDuration, onUpdateExercise, isMobileLandscape, isSessionCardio }) => {
    // New Grouping Visuals


    // Render Rest Item differently
    if (ex.type === 'REST') {
        const [localDuration, setLocalDuration] = useState(ex.duration || 60);

        const handleDurationUpdate = () => {
            const finalVal = localDuration === '' ? 0 : localDuration;
            if (onUpdateDuration && finalVal !== ex.duration) {
                onUpdateDuration(finalVal);
                if (localDuration === '') setLocalDuration(0);
            }
        };

        return (
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-2 relative group">
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <Coffee size={20} />
                </div>
                <div className="flex-1 flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">Descanso</h4>
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={localDuration}
                            onChange={(e) => {
                                const val = e.target.value;
                                setLocalDuration(val === '' ? '' : parseInt(val) || 0);
                            }}
                            onBlur={handleDurationUpdate}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleDurationUpdate();
                                    e.target.blur();
                                }
                            }}
                            onClick={(e) => e.target.select()}
                            className="w-16 px-2 py-1 text-xs font-bold bg-white border border-slate-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            min="0"
                            max="600"
                            step="5"
                        />
                        <span className="text-[10px] text-slate-500 font-bold">seg</span>
                    </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                </button>
            </div>
        );
    }

    // New Grouping Visuals
    // If 'isGrouped' is true, this item is attached to the previous one.
    // If 'nextIsGrouped' is true, the next item is attached to this one.

    // Styles for "Combined" items
    const mergedTopClass = isGrouped ? 'rounded-t-none border-t-0 mt-0 pt-4 border-t-slate-200/50' : 'mb-2';
    const mergedBottomClass = nextIsGrouped ? 'rounded-b-none border-b-0 mb-0 pb-4' : 'mb-2';
    // If connected in a chain, borders must be handled carefully.
    // Actually, if we merge them, we might want to remove borders between them or make them subtle.
    // User asked to "combine cards". Let's remove the spacing and inner borders.

    const cardBaseClass = "relative flex-1 flex items-center gap-3 p-3 bg-white border border-slate-200 shadow-sm transition-all cursor-pointer group/card";
    const groupedClass = isGrouped ? "border-t-0 rounded-t-none mt-0 pt-2" : "rounded-t-xl";
    const nextGroupedClass = nextIsGrouped ? "border-b-0 rounded-b-none mb-0 pb-2 z-10" : "rounded-b-xl mb-2";

    // Smart Summary Logic
    const getSummary = () => {
        if (isSessionCardio) return ''; // Hide structural summary for cardio sessions
        const sets = ex.config?.sets || [];
        if (sets.length === 0) return '0 Sets';

        const volType = ex.config?.volType || 'REPS';
        const intType = ex.config?.intType || 'RIR'; // defaults if missing
        const sharedTime = ex.config?.sharedTime || false;


        // 1. Check for Volume Uniformity
        const firstRep = sets[0]?.reps;
        const uniformReps = sets.every(s => s.reps === firstRep);

        // 2. Check for Intensity Uniformity
        const firstInt = sets[0]?.rir; // 'rir' field holds intensity value
        const uniformInt = sets.every(s => s.rir === firstInt);

        // Build string: "3 x 10 REPS @ 10kg"
        let text = `${sets.length} x `;

        if (uniformReps && firstRep) {
            // If it's a resistance exercise (or session is cardio), use full unit name
            if (isResistanceExercise(ex, isSessionCardio)) {
                if (volType === 'TIME') text += `${firstRep}s`;
                else if (volType === 'KCAL') text += `${firstRep} kcal`;
                else if (volType === 'METROS') text += `${firstRep}m`;
                else if (volType === 'KM') text += `${firstRep}km`;
                else text += firstRep;
            } else {
                text += firstRep;
            }

            // Add shared time indicator
            if (sharedTime && volType === 'TIME') {
                text += ' (compartido)';
            }
        } else {
            text += `(VAR)`; // Var volume
        }

        if (firstInt && uniformInt) {
            let intUnit = intType;
            if (intType === 'RIR') intUnit = 'RIR';
            else if (intType === 'PESO') intUnit = 'kg';
            else if (intType === '%') intUnit = '%';
            else if (intType === 'RPE') intUnit = 'RPE';
            else if (intType === 'WATTS') intUnit = 'W';
            else if (intType === 'BPM') intUnit = 'bpm';
            else if (intType === 'RITMO') intUnit = 'min/km';
            else if (intType === 'NIVEL') intUnit = 'nvl';

            text += ` @ ${firstInt}${intUnit === '%' ? '%' : ` ${intUnit}`}`;
        }

        return text;
    };

    return (
        <div className="relative flex flex-col">
            {/* Shared Time Badge (floating) - Only show on the 2nd exercise of the pair */}
            {ex.config?.sharedTime && isGrouped && (
                <div className="absolute -top-2 right-2 z-10 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md pointer-events-none">
                    <span>⏱️</span>
                    <span>COMPARTIDO</span>
                </div>
            )}

            {/* EMOM Badge (floating) - Only show on the 2nd exercise of the pair if EMOM */}
            {ex.config?.isEMOM && isGrouped && (
                <div className="absolute -top-2 right-2 z-10 bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md pointer-events-none">
                    <span>🕐</span>
                    <span>EMOM</span>
                </div>
            )}

            {/* Card */}
            <div
                className={`${cardBaseClass} ${groupedClass} ${nextGroupedClass} ${ex.config?.sharedTime
                    ? 'border-l-4 border-l-orange-500'
                    : ex.config?.isEMOM
                        ? 'border-l-4 border-l-emerald-500'
                        : isGrouped
                            ? 'border-l-4 border-l-blue-400'
                            : ''
                    }`}
                onClick={() => onConfigure(ex)}
            >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                    <ExerciseMedia exercise={ex} thumbnailMode={true} />
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{ex.name_es || ex.name || 'Ejercicio'}</h4>
                    {/* Show description preview if available */}
                    {(ex.description || (ex.instructions_es && ex.instructions_es.length > 0) || (ex.instructions && ex.instructions.length > 0)) && (
                        <div className="group relative">
                            <p className="text-[10px] text-slate-400 truncate cursor-help hover:text-slate-600 transition-colors">
                                ℹ️ {ex.description || (ex.instructions_es?.[0]) || (ex.instructions?.[0]) || 'Ver detalles'}
                            </p>
                            {/* Tooltip for long description */}
                            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                                {ex.description || (ex.instructions_es?.join(' ')) || (ex.instructions?.join(' ')) || ''}
                            </div>
                        </div>
                    )}
                    {/* Show notes indicator if exists */}
                    {ex.notes && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded font-black uppercase tracking-tighter">Nota</span>
                            <p className="text-[10px] text-amber-600 truncate font-bold italic">{ex.notes}</p>
                        </div>
                    )}
                    {/* Summary & Quick Selectors - Hide for Cardio Sessions */}
                    {!isSessionCardio ? (
                        <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <div className="relative group/sel">
                                <select
                                    value={ex.config?.volType || 'REPS'}
                                    onChange={(e) => onUpdateExercise?.({ ...ex, config: { ...(ex.config || {}), volType: e.target.value } })}
                                    className={`appearance-none text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider outline-none cursor-pointer transition-colors ${ex.config?.sharedTime
                                        ? 'bg-orange-100 text-orange-700'
                                        : ex.config?.isEMOM
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : isResistanceExercise(ex, isSessionCardio)
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <option value="REPS">REPS</option>
                                    <option value="TIME">TIME</option>
                                    {isResistanceExercise(ex, isSessionCardio) && (
                                        <>
                                            <option value="KCAL">KCAL</option>
                                            <option value="METROS">METROS</option>
                                            <option value="KM">KM</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div className="relative group/sel">
                                <select
                                    value={ex.config?.intType || 'RIR'}
                                    onChange={(e) => onUpdateExercise?.({ ...ex, config: { ...(ex.config || {}), intType: e.target.value } })}
                                    className="appearance-none text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight bg-white border border-slate-100 text-slate-400 outline-none cursor-pointer hover:border-slate-300 transition-all font-mono"
                                >
                                    <option value="RIR">RIR</option>
                                    <option value="PESO">KG</option>
                                    <option value="RPE">RPE</option>
                                    <option value="%">%MAX</option>
                                    {isResistanceExercise(ex, isSessionCardio) && (
                                        <>
                                            <option value="WATTS">W</option>
                                            <option value="BPM">BPM</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <p className="text-xs text-slate-400 font-bold ml-1">
                                {getSummary()}
                            </p>
                        </div>
                    ) : (
                        <div className="mt-1 flex items-center gap-1.5 opacity-60">
                            <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter flex items-center gap-1">
                                <Zap size={10} /> Configuración Inline
                            </span>
                            <p className="text-[10px] text-slate-400 font-bold italic">Planificar carga en calendario</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <ActionMenu actions={[
                        { label: 'Cambiar Ejercicio', icon: <Move size={16} />, onClick: (e) => { e?.stopPropagation?.(); onSwap?.(); } },
                        { label: 'Duplicar', icon: <Copy size={16} />, onClick: (e) => { e?.stopPropagation?.(); onDuplicate(); } },
                        { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: (e) => { e?.stopPropagation?.(); onRemove(); }, variant: 'danger' }
                    ]} />
                </div>
            </div>
        </div >
    );
};

// 2. Block Card Component
const BlockCard = ({ block, idx, onUpdate, onRemove, onDuplicate, onAddExercise, onSaveModule, onImportModule, onOpenConfig, onSwapExercise, onProtocolChange, isMobileLandscape, isSessionCardio, dragControls }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [linkMode, setLinkMode] = useState(false); // Toggle for connecting exercises

    const toggleExerciseGroup = (exIdx) => {
        const newExercises = [...block.exercises];
        const ex = newExercises[exIdx];
        // Toggle 'isGrouped' status
        ex.isGrouped = !ex.isGrouped;
        onUpdate({ ...block, exercises: newExercises });
    };

    const addRest = () => {
        const newExercises = [...block.exercises];
        newExercises.push({
            id: crypto.randomUUID(),
            type: 'REST',
            duration: 60,
            name: 'Descanso'
        });
        onUpdate({ ...block, exercises: newExercises });
    };

    return (
        <div data-block-id={idx} className={`bg-white md:bg-slate-50/50 md:rounded-2xl border-y md:border border-slate-200 overflow-hidden mb-2 md:mb-4 relative transition-all ${isMobileLandscape ? 'mb-2 rounded-xl' : ''}`}>
            {/* Header */}
            <div className={`bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 transition-all ${isMobileLandscape ? 'p-1' : 'p-2 md:p-4'}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0 mr-1">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {idx + 1}
                    </span>
                    {/* Drag Handle */}
                    <div
                        className="cursor-grab active:cursor-grabbing p-1 text-slate-300 hover:text-slate-500 transition-colors -ml-1 mr-1"
                        onPointerDown={(e) => dragControls?.start(e)}
                    >
                        <GripVertical size={18} />
                    </div>
                    <input
                        type="text"
                        value={block.name}
                        onChange={(e) => onUpdate({ ...block, name: e.target.value })}
                        className="font-black text-slate-900 bg-transparent outline-none focus:bg-slate-50 px-2 rounded -ml-2 flex-1 min-w-0 truncate transition-all text-sm"
                        placeholder="Nombre del Bloque"
                    />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Protocol Selector */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg mr-1 border border-slate-200">
                        {['L', 'T', 'R', 'E'].map(p => {
                            const protoKey = p === 'L' ? 'LIBRE' : `PDP-${p}`;
                            const isSelected = block.protocol === protoKey;
                            return (
                                <button
                                    key={p}
                                    onClick={() => onProtocolChange ? onProtocolChange(protoKey) : onUpdate({ ...block, protocol: protoKey })}
                                    className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    title={protoKey}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>

                    <ActionMenu
                        actions={[
                            { label: 'Importar Módulo', icon: <Download size={16} />, onClick: onImportModule },
                            { label: 'Guardar como Módulo', icon: <UploadCloud size={16} />, onClick: onSaveModule },
                            { label: 'Duplicar Bloque', icon: <Copy size={16} />, onClick: onDuplicate },
                            { label: 'Eliminar Bloque', icon: <Trash2 size={16} />, onClick: onRemove, variant: 'danger' }
                        ]}
                    />

                    <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                </div>
            </div>

            {/* Body */}
            < AnimatePresence >
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                        className="p-4"
                    >
                        {/* Empty State */}
                        {block.exercises.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-xs text-slate-400 mb-2 font-bold">Sin Ejercicios</p>
                                <button
                                    onClick={onAddExercise}
                                    className="text-emerald-600 text-xs font-black uppercase tracking-wider hover:underline"
                                >
                                    + Añadir Ejercicio
                                </button>
                            </div>
                        )}

                        {/* Exercise List */}
                        <div className="space-y-0">
                            {(() => {
                                const groups = [];
                                let currentGrp = [];
                                block.exercises.forEach((ex, i) => {
                                    if (ex.isGrouped && currentGrp.length > 0) {
                                        currentGrp.push({ ex, i });
                                    } else {
                                        if (currentGrp.length > 0) groups.push(currentGrp);
                                        currentGrp = [{ ex, i }];
                                    }
                                });
                                if (currentGrp.length > 0) groups.push(currentGrp);

                                return groups.map((grp, gIdx) => {
                                    const isGroup = grp.length > 1;
                                    const groupRest = isGroup ? (grp[0].ex.config?.sets?.[0]?.rest ?? 60) : null;

                                    return (
                                        <div key={gIdx} className={isGroup ? "bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed p-2 mb-4" : ""}>
                                            {isGroup && (
                                                <div className="flex items-center justify-between px-2 mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                                            {grp.length === 2 ? 'Súper Serie' : 'Circuito'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span className="text-[9px] font-bold text-slate-500 uppercase">Descanso Ronda</span>
                                                        <input
                                                            type="number"
                                                            value={groupRest}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value) || 0;
                                                                const newExercises = [...block.exercises];
                                                                grp.forEach(item => {
                                                                    const ex = { ...newExercises[item.i] };
                                                                    const config = { ...(ex.config || { sets: [] }) };
                                                                    const sets = (config.sets || []).map(s => ({ ...s, rest: val }));
                                                                    newExercises[item.i] = { ...ex, config: { ...config, sets } };
                                                                });
                                                                onUpdate({ ...block, exercises: newExercises });
                                                            }}
                                                            className="w-12 text-center text-[11px] font-black text-slate-800 focus:outline-none"
                                                        />
                                                        <span className="text-[9px] font-bold text-slate-400">s</span>
                                                    </div>
                                                </div>
                                            )}

                                            {grp.map((item, grpIdx) => {
                                                const { ex, i: exIdx } = item;
                                                const nextEx = grp[grpIdx + 1] || block.exercises[exIdx + 1];
                                                const isNextGrouped = grp[grpIdx + 1] ? true : (block.exercises[exIdx + 1]?.isGrouped || false);

                                                return (
                                                    <React.Fragment key={ex.id || exIdx}>
                                                        <ExerciseItem
                                                            ex={ex}
                                                            idx={exIdx}
                                                            isSessionCardio={isSessionCardio}
                                                            isGrouped={ex.isGrouped}
                                                            nextIsGrouped={grp[grpIdx + 1] ? true : false}
                                                            isLinkMode={linkMode}
                                                            onConfigure={() => onOpenConfig(idx, exIdx)}
                                                            onSwap={() => onSwapExercise(idx, exIdx)}
                                                            onUpdateDuration={(newDuration) => {
                                                                const newEx = [...block.exercises];
                                                                newEx[exIdx] = { ...ex, duration: newDuration };
                                                                onUpdate({ ...block, exercises: newEx });
                                                            }}
                                                            onDuplicate={() => {
                                                                const newEx = [...block.exercises];
                                                                const copy = { ...ex, id: crypto.randomUUID(), name: `${ex.name} (Copia)` };
                                                                newEx.splice(exIdx + 1, 0, copy);
                                                                onUpdate({ ...block, exercises: newEx });
                                                            }}
                                                            onUpdateExercise={(updatedEx) => {
                                                                const newEx = [...block.exercises];
                                                                newEx[exIdx] = updatedEx;
                                                                onUpdate({ ...block, exercises: newEx });
                                                            }}
                                                            onRemove={() => {
                                                                const newEx = block.exercises.filter((_, i) => i !== exIdx);
                                                                onUpdate({ ...block, exercises: newEx });
                                                            }}
                                                        />

                                                        {/* Linker Button (Between Cards) */}
                                                        {linkMode && exIdx < block.exercises.length - 1 && ex.type !== 'REST' && (block.exercises[exIdx + 1]?.type !== 'REST') && (
                                                            <div className="h-4 -my-2 flex justify-center items-center z-20 relative">
                                                                <button
                                                                    onClick={() => toggleExerciseGroup(exIdx + 1)}
                                                                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${block.exercises[exIdx + 1]?.isGrouped ? 'bg-blue-500 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-400 hover:scale-110'}`}
                                                                >
                                                                    {block.exercises[exIdx + 1]?.isGrouped ? <Link2 size={12} /> : <Plus size={12} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </div>
                                    );
                                });
                            })()}
                        </div>

                        {/* Footer / Add Button */}
                        <div className="mt-4 flex items-center justify-between">
                            <div className="flex gap-2">
                                <button
                                    onClick={onAddExercise}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Plus size={14} /> Ejercicio
                                </button>
                                <button
                                    onClick={addRest}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
                                    title="Añadir Descanso"
                                >
                                    <Coffee size={14} />
                                </button>
                            </div>

                            {/* Superset Toggle (Granular) */}
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${linkMode ? 'text-blue-600' : 'text-slate-400'}`}>
                                    Link Mode
                                </span>
                                <button
                                    onClick={() => setLinkMode(!linkMode)}
                                    className={`w-10 h-6 rounded-full p-1 transition-colors ${linkMode ? 'bg-blue-500' : 'bg-slate-200'}`}
                                >
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${linkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
        </div >
    );
};

// 3. Exercise Configuration Drawer (The "Load Editor")
const ExerciseConfigDrawer = ({ isOpen, onClose, exercise, onSave, isGrouped, isSessionCardio }) => {
    const [config, setConfig] = useState(exercise?.config || {
        volType: 'REPS',
        intType: 'RIR',
        sets: []
    });
    const [notes, setNotes] = useState(exercise?.notes || '');

    // Reset state when exercise changes
    useEffect(() => {
        if (exercise) {
            setConfig(exercise.config || {
                volType: 'REPS',
                intType: 'RIR',
                sets: []
            });
            setNotes(exercise.notes || '');
        }
    }, [exercise]);

    const handleAddSet = () => {
        const lastSet = config.sets[config.sets.length - 1] || { reps: 10, rir: 2, weight: '', rest: 60 };
        setConfig({ ...config, sets: [...config.sets, { ...lastSet }] });
    };

    const handleUpdateSet = (idx, field, value) => {
        const newSets = [...config.sets];
        newSets[idx] = { ...newSets[idx], [field]: value };
        setConfig({ ...config, sets: newSets });
    };

    const handleDuplicateSet = (idx) => {
        const set = config.sets[idx];
        const newSets = [...config.sets];
        newSets.splice(idx + 1, 0, { ...set });
        setConfig({ ...config, sets: newSets });
    };

    const handleRemoveSet = (idx) => {
        setConfig({ ...config, sets: config.sets.filter((_, i) => i !== idx) });
    };

    // Extract YouTube video ID from URL
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSave = () => {
        onSave({ ...exercise, config, notes });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, x: '100%' }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: '100%' }}
                    className="absolute inset-0 bg-white z-50 flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
                        <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
                            <ChevronDown className="rotate-90" size={24} />
                        </button>
                        <h3 className="font-black text-slate-800 text-lg flex-1 truncate">{exercise?.name_es || exercise?.name}</h3>
                        <button onClick={handleSave} className="text-emerald-600 font-bold text-sm">Guardar</button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 spacing-y-4">

                        {/* Visual Preview - Enlarged and with YouTube support */}
                        <div className="flex justify-center mb-6">
                            <div className="w-full aspect-video bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner relative">
                                <ExerciseMedia exercise={exercise} />
                            </div>
                        </div>

                        {/* Exercise Description / Instructions */}
                        <div className="mb-6">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Instrucciones</p>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-600 leading-relaxed text-left">
                                {exercise?.description || (exercise?.instructions_es?.join(' ')) || (exercise?.instructions?.join(' ')) || 'Sin instrucciones detalladas.'}
                            </div>
                        </div>

                        {/* Sets Editor */}
                        {isSessionCardio ? (
                            <div className="mb-6 bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center space-y-3">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                                    <Zap size={24} />
                                </div>
                                <h4 className="text-sm font-black text-blue-900 uppercase">Sin Carga Estructural</h4>
                                <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                    Esta sesión es de tipo <b>CARDIO</b>. <br />
                                    La carga (series, tiempo, intensidad, zonas) se configura de forma <b>inline</b> directamente en la planificación para cada atleta.
                                </p>
                            </div>
                        ) : (
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Series / Rondas</label>

                                        {/* Compact Cardio Trigger */}
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold transition-all ${isSessionCardio
                                            ? 'bg-blue-50 border-blue-200 text-blue-600'
                                            : config.forceCardio
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm'
                                                : 'bg-slate-50 border-slate-100 text-slate-400'
                                            }`}>
                                            <Zap size={10} className={isSessionCardio || config.forceCardio ? 'text-blue-500' : 'text-slate-300'} />
                                            <span>CARDIO</span>
                                            {!isSessionCardio && (
                                                <button
                                                    onClick={() => setConfig({ ...config, forceCardio: !config.forceCardio })}
                                                    className={`w-6 h-3 rounded-full relative transition-colors ${config.forceCardio ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                                >
                                                    <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${config.forceCardio ? 'right-0.5' : 'left-0.5'}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono">Total Vol: {config.sets.length}</span>
                                </div>

                                <div className="space-y-2">
                                    {/* Header Row with Dropdowns */}
                                    <div className="grid grid-cols-[24px_1fr_1fr_1fr_52px] gap-1 text-[10px] font-bold text-slate-400 text-center mb-1 items-end">
                                        <span>#</span>

                                        {/* Volume Type Selector */}
                                        <div className="relative group">
                                            <select
                                                value={config.volType || 'REPS'}
                                                onChange={(e) => setConfig({ ...config, volType: e.target.value })}
                                                className="appearance-none bg-transparent text-center outline-none font-bold uppercase cursor-pointer w-full text-slate-400 hover:text-slate-600"
                                            >
                                                <option value="REPS">REPS</option>
                                                <option value="TIME">TIEMPO (s)</option>
                                                {isResistanceExercise(exercise, isSessionCardio) && (
                                                    <>
                                                        <option value="KCAL">KCAL</option>
                                                        <option value="METROS">METROS</option>
                                                        <option value="KM">KILÓMETROS</option>
                                                    </>
                                                )}
                                            </select>
                                            <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                        </div>

                                        {/* Intensity Type Selector */}
                                        <div className="relative group">
                                            <select
                                                value={config.intType || 'RIR'}
                                                onChange={(e) => setConfig({ ...config, intType: e.target.value })}
                                                className="appearance-none bg-transparent text-center outline-none font-bold uppercase cursor-pointer w-full text-slate-400 hover:text-slate-600"
                                            >
                                                <option value="RIR">RIR</option>
                                                <option value="PESO">PESO</option>
                                                <option value="%">% MAX</option>
                                                <option value="RPE">RPE</option>
                                                {isResistanceExercise(exercise, isSessionCardio) && (
                                                    <>
                                                        <option value="WATTS">WATTS (W)</option>
                                                        <option value="BPM">PULSO (BPM)</option>
                                                        <option value="RITMO">RITMO</option>
                                                        <option value="NIVEL">NIVEL</option>
                                                    </>
                                                )}
                                            </select>
                                            <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                                        </div>

                                        <span>DESC (s)</span>
                                        <span></span>
                                    </div>

                                    {/* Shared Time Toggle (only for TIME volType) */}
                                    {config.volType === 'TIME' && (
                                        <div className="mt-3 mb-2 flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">⏱️</span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">Tiempo Compartido</p>
                                                    <p className="text-[10px] text-slate-500">AMRAP - Los ejercicios del par comparten el tiempo total</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setConfig({
                                                    ...config,
                                                    sharedTime: !config.sharedTime
                                                })}
                                                className={`w-11 h-6 rounded-full p-1 transition-colors ${config.sharedTime ? 'bg-orange-500' : 'bg-slate-300'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.sharedTime ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                        </div>
                                    )}

                                    {/* EMOM Toggle (only for REPS volType) */}
                                    {config.volType === 'REPS' && (
                                        <div className="mt-3 mb-2 flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">🕐</span>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">EMOM</p>
                                                    <p className="text-[10px] text-slate-500">Every Minute On the Minute - Timer por minutos</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setConfig({
                                                    ...config,
                                                    isEMOM: !config.isEMOM
                                                })}
                                                className={`w-11 h-6 rounded-full p-1 transition-colors ${config.isEMOM ? 'bg-emerald-500' : 'bg-slate-300'
                                                    }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${config.isEMOM ? 'translate-x-5' : 'translate-x-0'
                                                    }`} />
                                            </button>
                                        </div>
                                    )}

                                    {config.sets.map((set, sIdx) => (
                                        <div key={sIdx} className="grid grid-cols-[24px_1fr_1fr_1fr_52px] gap-1 items-center">
                                            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                                                {sIdx + 1}
                                            </div>
                                            <input
                                                type="text" // numeric text
                                                value={set.reps || ''}
                                                onChange={(e) => handleUpdateSet(sIdx, 'reps', e.target.value)}
                                                placeholder={
                                                    config.volType === 'TIME' ? "45s" :
                                                        config.volType === 'KCAL' ? "200" :
                                                            (config.volType === 'METROS' || config.volType === 'KM') ? "500" : "10"
                                                }
                                                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-bold text-slate-700 outline-none focus:border-blue-400 min-w-0 w-full"
                                            />
                                            <input
                                                type="text"
                                                value={set.rir || ''}
                                                onChange={(e) => handleUpdateSet(sIdx, 'rir', e.target.value)}
                                                placeholder={
                                                    config.intType === 'PESO' ? "20kg" :
                                                        config.intType === '%' ? "75%" :
                                                            config.intType === 'WATTS' ? "250W" :
                                                                config.intType === 'BPM' ? "150" :
                                                                    config.intType === 'RITMO' ? "5:00" : "2"
                                                }
                                                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-bold text-slate-700 outline-none focus:border-blue-400 min-w-0 w-full"
                                            />
                                            <input
                                                type="number"
                                                value={set.rest || ''}
                                                onChange={(e) => handleUpdateSet(sIdx, 'rest', e.target.value)}
                                                placeholder="60"
                                                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 text-center text-xs font-bold text-slate-700 outline-none focus:border-blue-400 min-w-0 w-full"
                                            />
                                            <div className="flex items-center gap-0.5 shrink-0 justify-center">
                                                <button onClick={() => handleDuplicateSet(sIdx)} className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded">
                                                    <Copy size={13} />
                                                </button>
                                                <button onClick={() => handleRemoveSet(sIdx)} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded">
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Rest Logic Info */}
                                <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg flex items-start gap-2">
                                    < MoreVertical size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    {isGrouped ? (
                                        <p className="text-[10px] text-blue-600 font-bold leading-tight">
                                            Este ejercicio es parte de una Súper Serie/Circuito. El descanso configurado aquí actúa como el "Descanso de Ronda".
                                        </p>
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic leading-tight">
                                            Tiempo de descanso después de completar la serie.
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={handleAddSet}
                                    className="w-full mt-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-emerald-300 hover:text-emerald-500 transition-colors"
                                >
                                    + Añadir Serie
                                </button>
                            </div>
                        )}

                        {/* Notes */}
                        <div>
                            <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2 block">Notas de Ejecución</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 min-h-[100px]"
                                placeholder="Tempo 3-0-1, pausa en contracción..."
                            />
                        </div>

                        <div className="h-20" />
                    </div>
                </motion.div>
            )
            }
        </AnimatePresence >
    );
};

// 3. Draggable Block Wrapper
const DraggableBlock = ({ block, idx, ...props }) => {
    const controls = useDragControls();
    return (
        <Reorder.Item
            as="div"
            value={block}
            dragControls={controls}
            dragListener={false}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
        >
            <BlockCard {...props} block={block} idx={idx} dragControls={controls} />
        </Reorder.Item>
    );
};

const GlobalCreator = ({ embeddedMode = false, initialSession = null, onClose, onSave, onDirtyChange }) => {
    // Main View State: 'editor' | 'library' | 'sessions'
    const [mainView, setMainView] = useState('editor');

    // Session State
    const [sessionTitle, setSessionTitle] = useState(initialSession?.name || initialSession?.title || 'Día 1 SESIÓN');
    const [sessionGroup, setSessionGroup] = useState(initialSession?.group || '');
    const [sessionDescription, setSessionDescription] = useState(initialSession?.description || '');
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);
    const [blocks, setBlocks] = useState(initialSession?.blocks || [
        { id: '1', name: 'Bloque 1', exercises: [] }
    ]);
    const [sessionType, setSessionType] = useState(initialSession?.type || 'LIBRE'); // LIBRE, PDP-T, PDP-R, PDP-E
    const [isCardio, setIsCardio] = useState(initialSession?.isCardio || false);
    const [rightSidebarView, setRightSidebarView] = useState('overview'); // 'overview' | 'library'

    // Config State
    const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
    const [activeExerciseObj, setActiveExerciseObj] = useState(null); // Full exercise object for editing
    const [activeBlockIdx, setActiveBlockIdx] = useState(null);
    const [activeExIdx, setActiveExIdx] = useState(null);
    const [linkMode, setLinkMode] = useState(false); // Superseries link mode

    // --- GLOBAL MODE STATE (Training vs Nutrition) ---
    const [globalMode, setGlobalMode] = useState('TRAINING'); // 'TRAINING', 'NUTRITION'
    const [nutritionView, setNutritionView] = useState('FOODS'); // 'FOODS', 'RECIPES', 'DAYS'
    const [allNutritionDays, setAllNutritionDays] = useState([]);
    const [isDayEditorOpen, setIsDayEditorOpen] = useState(false);
    const [activeDayId, setActiveDayId] = useState(null); // ID or null for new



    // Data & Picker State
    const [allExercises, setAllExercises] = useState([]);
    const [allModules, setAllModules] = useState([]);
    const [allSessions, setAllSessions] = useState([]); // For sessions list view
    const [allGroups, setAllGroups] = useState([]); // Explicit groups from DB
    const [newGroupName, setNewGroupName] = useState(''); // State for new group input
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [movingSession, setMovingSession] = useState(null); // Session being quickly moved
    const [previewingSession, setPreviewingSession] = useState(null); // Session being previewed in read-only modal
    const [movingExercise, setMovingExercise] = useState(null); // Exercise being quickly moved
    const [isMoving, setIsMoving] = useState(false);
    const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
    const [activeBlockIdxForPicker, setActiveBlockIdxForPicker] = useState(null);
    const [modulePickerOpen, setModulePickerOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pickerSearch, setPickerSearch] = useState('');
    const [pickerFilter, setPickerFilter] = useState({ pattern: [], equipment: [], level: [], quality: [], group: [] });
    const [pickerTab, setPickerTab] = useState('library'); // 'library' | 'online'
    const [onlineResults, setOnlineResults] = useState([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);
    const [expandedOnlineEx, setExpandedOnlineEx] = useState(null);
    const [discoveryMode, setDiscoveryMode] = useState(false);
    const [bulkExercises, setBulkExercises] = useState([]); // Cache for all exercises

    // Swap Mode State (for replacing exercise while keeping config)
    const [swapMode, setSwapMode] = useState(false);
    const [swapTarget, setSwapTarget] = useState(null); // { blockIdx, exIdx, config }

    // Quick Creator State
    const [quickCreatorOpen, setQuickCreatorOpen] = useState(false);
    const [creationData, setCreationData] = useState({
        name: '',
        group: '',
        pattern: 'Squat',
        equipment: 'Ninguno (Peso Corporal)',
        level: 'Intermedio',
        quality: 'Fuerza',
        mediaUrl: '', imageStart: '', imageEnd: '', youtubeUrl: '', description: '',
        tags: []
    });

    const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
    const [pdpDropdownOpen, setPdpDropdownOpen] = useState(false);

    // Library Edit State
    const [libraryEditDrawerOpen, setLibraryEditDrawerOpen] = useState(false);
    const [libraryEditExercise, setLibraryEditExercise] = useState(null);
    const [libraryFilterDrawerOpen, setLibraryFilterDrawerOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({}); // For grouped session view

    // Filter Exercise List Helper Function
    const filterExerciseList = (exercises, searchTerm, filters) => {
        return exercises.filter(ex => {
            // Search Filter
            const term = searchTerm.toLowerCase();
            const esName = (ex.name_es || '').toLowerCase();
            const enName = (ex.name || '').toLowerCase();
            const matchesSearch = !term || esName.includes(term) || enName.includes(term) || (ex.tags || []).some(t => t.toLowerCase().includes(term));

            if (!matchesSearch) return false;

            // Category Filters
            if (filters.pattern.length > 0 && !filters.pattern.includes(ex.pattern)) return false;

            // Equipment Filter
            if (filters.equipment.length > 0) {
                const equipmentList = ex.equipmentList_es || [];
                const equipmentString = (ex.equipment_es || ex.equipment || '');

                const matchesEq = filters.equipment.some(selectedEq => {
                    if (equipmentList.includes(selectedEq)) return true;
                    return equipmentString.includes(selectedEq);
                });

                if (!matchesEq) return false;
            }

            if (filters.level.length > 0 && !filters.level.includes(ex.level)) return false;

            if (filters.quality.length > 0) {
                const matchesQuality = filters.quality.some(qId => {
                    // Check array qualities
                    const inArray = (ex.qualities || []).includes(qId);
                    if (inArray) return true;

                    // Check single quality string with normalization
                    const qString = (ex.quality || '').toUpperCase();
                    if (qId === 'E') return qString === 'E' || qString.startsWith('ENERG') || qString.includes('PDP-E');
                    if (qId === 'F') return qString === 'F' || qString.startsWith('FUERZ') || qString.includes('PDP-R') || qString.includes('PDP-T');
                    if (qId === 'M') return qString === 'M' || qString.startsWith('MOVIL');
                    if (qId === 'C') return qString === 'C' || qString.startsWith('CONTR');

                    return qString === qId;
                });
                if (!matchesQuality) return false;
            }

            if (filters.group && filters.group.length > 0) {
                const exGroup = ex.group || 'Sin agrupar';
                if (!filters.group.includes(exGroup)) return false;
            }

            return true;
        });
    };

    // Toggle filter helper
    const toggleFilter = (type, value) => {
        setPickerFilter(prev => {
            const list = prev[type];
            const exists = list.includes(value);
            return {
                ...prev,
                [type]: exists ? list.filter(item => item !== value) : [...list, value]
            };
        });
    };

    // Track dirty state
    const [isDirty, setIsDirty] = useState(false);
    const [exDrawerDirty, setExDrawerDirty] = useState(false); // Track child drawer
    const [isMobileLandscape, setIsMobileLandscape] = useState(false);
    const [isMobilePortrait, setIsMobilePortrait] = useState(false);
    const [isLibraryDragging, setIsLibraryDragging] = useState(false);
    const [sidebarFilterOpen, setSidebarFilterOpen] = useState(false);

    // Derived Group Lists
    // existing groups might lack 'type', assume 'SESSION' if missing
    const sessionGroups = useMemo(() => {
        return allGroups
            .filter(g => g.type === 'SESSION' || !g.type)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allGroups]);

    const exerciseGroups = useMemo(() => {
        const explicitGroups = allGroups.filter(g => g.type === 'EXERCISE');
        const usedGroups = new Set(allExercises.map(ex => ex.group).filter(Boolean));

        // Merge them
        const combined = [...explicitGroups];
        usedGroups.forEach(groupName => {
            if (!combined.some(g => g.name === groupName)) {
                combined.push({ id: `used_${groupName}`, name: groupName, type: 'EXERCISE' });
            }
        });

        return combined.sort((a, b) => a.name.localeCompare(b.name));
    }, [allGroups, allExercises]);

    useEffect(() => {
        const checkOrientation = () => {
            // landscape if width > height AND height is small (mobile-like)
            const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 540;
            const portrait = window.innerWidth < 768 && window.innerHeight > window.innerWidth;
            setIsMobileLandscape(landscape);
            setIsMobilePortrait(portrait);
        };
        window.addEventListener('resize', checkOrientation);
        checkOrientation();
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);
    const [initialState, setInitialState] = useState(null);

    // Initialize state logic
    useEffect(() => {
        const startState = {
            name: initialSession?.name || initialSession?.title || 'Día 1 SESIÓN',
            description: initialSession?.description || '',
            blocks: initialSession?.blocks || [{ id: '1', name: 'Bloque 1', exercises: [] }]
        };
        // We only set this once on mount/init to establish baseline
        if (!initialState) {
            setInitialState(JSON.stringify(startState));
        }
    }, [initialSession]);

    // Check for changes & Notify/Block
    useEffect(() => {
        if (!initialState) return;

        const currentState = JSON.stringify({
            name: sessionTitle,
            group: sessionGroup,
            description: sessionDescription,
            blocks: blocks
        });

        const sessionDirty = currentState !== initialState;
        setIsDirty(sessionDirty);

        const totalDirty = sessionDirty || exDrawerDirty;

        if (embeddedMode) {
            // If embedded, notify parent
            if (onDirtyChange) onDirtyChange(totalDirty);
        }

    }, [sessionTitle, sessionDescription, blocks, initialState, exDrawerDirty, embeddedMode, onDirtyChange]);

    const [daySearchTerm, setDaySearchTerm] = useState(''); // Added missing state

    // Enable Protection (Only if standalone)
    // If embedded, the parent (ProgramBuilder) handles the blocking
    useUnsavedChanges(!embeddedMode && (isDirty || exDrawerDirty));

    const [visibleCount, setVisibleCount] = useState(50); // Pagination state

    useEffect(() => {
        TrainingDB.exercises.getAll().then(setAllExercises);
        TrainingDB.modules.getAll().then(setAllModules);
        TrainingDB.sessions.getAll().then(setAllSessions);
        TrainingDB.groups.getAll().then(setAllGroups);
    }, []);

    // --- NUTRITION LOGIC ---
    useEffect(() => {
        if (globalMode === 'NUTRITION' && nutritionView === 'DAYS') {
            loadNutritionDays();
        }
    }, [globalMode, nutritionView]);

    const loadNutritionDays = async () => {
        try {
            const days = await NutritionDB.days.getAll();
            setAllNutritionDays(days);
        } catch (error) {
            console.error('Error loading nutrition days:', error);
        }
    };

    const handleCreateNutritionDay = () => {
        setActiveDayId(null);
        setIsDayEditorOpen(true);
    };

    const handleEditNutritionDay = (day) => {
        setActiveDayId(day.id);
        setIsDayEditorOpen(true);
    };

    const handleDuplicateNutritionDay = async (day) => {
        if (window.confirm(`¿Duplicar día "${day.name}"?`)) {
            try {
                const { id, ...data } = day;
                const newDay = { ...data, name: `${data.name} (Copia)` };
                await NutritionDB.days.create(newDay);
                loadNutritionDays();
            } catch (e) {
                console.error(e);
                alert('Error al duplicar día');
            }
        }
    };

    const handleDeleteNutritionDay = async (id) => {
        if (window.confirm('¿Eliminar este día de nutrición?')) {
            await NutritionDB.days.delete(id);
            loadNutritionDays();
        }
    };

    const handleNutritionDaySave = async (dayData) => {
        try {
            if (activeDayId) {
                await NutritionDB.days.update(activeDayId, dayData);
            } else {
                await NutritionDB.days.create(dayData);
            }
            setIsDayEditorOpen(false);
            loadNutritionDays();
        } catch (error) {
            console.error('Error saving nutrition day:', error);
            alert('Error al guardar día de nutrición');
        }
    };

    // --- Search & Discovery Logic ---

    // Online Search Debounce / Discovery Filter
    useEffect(() => {
        // Reset visible count when search term changes or tab changes
        setVisibleCount(50);
    }, [pickerSearch, pickerTab]);

    useEffect(() => {
        if (pickerTab !== 'online') return;

        if (discoveryMode) {
            // Local search in bulk downloaded data
            const term = pickerSearch.trim().toLowerCase();
            const hasFilters = pickerFilter.pattern.length > 0;

            if (!term && !hasFilters) {
                setOnlineResults(bulkExercises.slice(0, visibleCount));
                return;
            }

            // Create lookup sets for fast duplicate detection
            const existingIds = new Set(allExercises.map(e => e.externalId).filter(Boolean));
            const existingNames = new Set(allExercises.map(e => (e.nameOriginal || e.name || '').toLowerCase()).filter(Boolean));

            const filtered = bulkExercises.filter(ex => {
                // 0. Exclude Duplicates (Already in Library)
                if (ex.id && existingIds.has(ex.id)) return false;
                if (ex.name && existingNames.has(ex.name.toLowerCase())) return false;

                // 1. Safe Text Search
                const name = (ex.name || '').toLowerCase();
                const target = (ex.target || '').toLowerCase();
                const bodyPart = (ex.bodyPart || '').toLowerCase();

                const matchesSearch = !term || name.includes(term) || target.includes(term) || bodyPart.includes(term);
                if (!matchesSearch) return false;

                // 2. Pattern Filter (Map English BodyPart -> Spanish Pattern)
                if (pickerFilter.pattern.length > 0) {
                    // Use the helper to map English bodyPart (e.g. "upper legs") to our Pattern (e.g. "Squat")
                    const mappedPattern = ExerciseAPI.mapBodyPartToPattern ? ExerciseAPI.mapBodyPartToPattern(ex.bodyPart || '') : '';
                    if (!pickerFilter.pattern.includes(mappedPattern)) return false;
                }

                // Equipment Filter (Simple English matching)
                if (pickerFilter.equipment.length > 0) {
                    const eqLower = (ex.equipment || '').toLowerCase();
                    // We match if the English equipment name contains any of our mapped keywords
                    // OR just simple check if we can't map. 
                    // For now, let's try to match strict if it's a known type
                    const matchesEq = pickerFilter.equipment.some(filterEq => {
                        // Basic mapping: "Barra" -> "barbell", "Mancuernas" -> "dumbbell"
                        const map = {
                            'Barra': 'barbell',
                            'Mancuerna': 'dumbbell',
                            'Kettlebell': 'kettlebell',
                            'Peso Corporal': 'body weight',
                            'Máquina': 'machine',
                            'Cable': 'cable',
                            'TRX/anillas': 'suspension',
                            'Disco': 'plate'
                        };
                        const targetEng = map[filterEq] || filterEq.toLowerCase();
                        return eqLower.includes(targetEng);
                    });
                    if (!matchesEq) return false;
                }

                return true;
            });
            setOnlineResults(filtered.slice(0, visibleCount));
            return;
        }

        // Standard Online Search logic
        const term = pickerSearch.trim();
        if (!term || term.length < 3) {
            setOnlineResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearchingOnline(true);
            try {
                const results = await ExerciseAPI.searchOnline(term);
                setOnlineResults(results);
            } catch (err) {
                console.error(err);
            } finally {
                setIsSearchingOnline(false);
            }
        }, 600);

        return () => clearTimeout(timer);
    }, [pickerSearch, pickerTab, discoveryMode, bulkExercises, pickerFilter, visibleCount]);

    const handleEnableDiscovery = async () => {
        if (bulkExercises.length > 0) {
            setDiscoveryMode(true);
            return;
        }

        setIsSearchingOnline(true);
        try {
            console.log('Fetching full ExerciseDB catalog...');
            const all = await ExerciseAPI.fetchFullCatalog();
            setBulkExercises(all);

            // Sync current results
            setOnlineResults(all.slice(0, 50));

            setDiscoveryMode(true);
        } catch (err) {
            console.error('Error in Discovery Mode:', err);
            alert('Error al cargar catálogo completo: ' + err.message);
        } finally {
            setIsSearchingOnline(false);
        }
    };

    // Export catalog for LLM processing
    const handleExportCatalog = () => {
        if (bulkExercises.length === 0) {
            alert('Primero activa el Modo Discovery para cargar el catálogo');
            return;
        }

        // Structure exercises with our schema + placeholders for LLM
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalExercises: bulkExercises.length,
                version: "1.0",
                instructions: "Este archivo debe ser procesado por un LLM para traducir y enriquecer los datos. Ver prompt adjunto."
            },
            exercises: bulkExercises.map(ex => ({
                // Original data (works with both ExerciseDB and GitHub)
                id: ex.id,
                name: ex.name,
                bodyPart: ex.bodyPart,
                target: ex.target,
                secondaryMuscles: ex.secondaryMuscles || [],
                equipment: ex.equipment,
                gifUrl: ex.gifUrl || '',
                imageStart: ex.imageStart || '',  // GitHub: start position
                imageEnd: ex.imageEnd || '',      // GitHub: end position
                instructions: ex.instructions || [],

                // Extra fields from GitHub dataset
                level_original: ex.level || '',   // beginner/intermediate/expert
                force_original: ex.force || '',   // push/pull/static
                mechanic_original: ex.mechanic || '', // compound/isolation

                // To be filled by LLM
                name_es: "",                    // Traducción del nombre
                instructions_es: [],            // Instrucciones en español

                // Biomechanical classification (LLM should infer)
                pattern: "",                    // Squat|Hinge|Push|Pull|Lunge|Carry|Core|Global
                forceType: ex.force || "",      // Pre-fill from GitHub if available
                movementType: ex.mechanic === 'compound' ? 'Compuesto' : (ex.mechanic === 'isolation' ? 'Aislamiento' : ''),
                plane: "",                      // Sagital|Frontal|Transversal|Multi
                unilateral: false,

                // Physical qualities (LLM should assign)
                qualities: [],                  // ["F","E","M","C"] - Fuerza, Energía, Movilidad, Control
                subQualities: [],               // Secondary tags

                // Training attributes (LLM should infer)
                level: ex.level || "",          // Pre-fill from GitHub if available
                loadable: false,

                // Equipment (translated + list for multiple)
                equipment_es: "",               // Traducción del equipamiento
                equipmentList: [ex.equipment],  // Array for multiple equipment
                equipmentList_es: [],           // Translated equipment array

                // Management (leave empty)
                isFavorite: false,
                mediaUrl_backup: null,
                usageCount: 0,
                lastUsed: null,
                tags: [],
                source: ex.imageStart ? "github" : "exercisedb"
            }))
        };

        // Download as JSON
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exercisedb_catalog_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✅ Exportados ${bulkExercises.length} ejercicios. Ahora procésalos con el LLM.`);
    };

    // Import processed catalog from LLM
    const handleImportProcessedCatalog = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.exercises || !Array.isArray(data.exercises)) {
                throw new Error('Formato de archivo inválido');
            }

            const exercises = data.exercises;
            const confirmed = window.confirm(
                `¿Importar ${exercises.length} ejercicios a la base de datos?\n\nEsto puede tardar varios minutos.`
            );

            if (!confirmed) return;

            setIsSaving(true);
            let imported = 0;
            let errors = 0;

            for (const ex of exercises) {
                try {
                    // Use name_es as primary name, fallback to original
                    await TrainingDB.exercises.create({
                        externalId: ex.id,
                        name: ex.name_es || ex.name,
                        nameOriginal: ex.name,
                        bodyPart: ex.bodyPart,
                        target: ex.target,
                        secondaryMuscles: ex.secondaryMuscles || [],
                        equipment: ex.equipment_es || ex.equipment,
                        equipmentOriginal: ex.equipment,
                        mediaUrl: ex.gifUrl,
                        description: (ex.instructions_es || []).join('\n'),
                        instructionsOriginal: ex.instructions || [],
                        pattern: ex.pattern || 'Global',
                        forceType: ex.forceType || '',
                        movementType: ex.movementType || '',
                        plane: ex.plane || '',
                        unilateral: ex.unilateral || false,
                        qualities: ex.qualities || [],
                        subQualities: ex.subQualities || [],
                        level: ex.level || 'Intermedio',
                        loadable: ex.loadable || false,
                        isFavorite: false,
                        mediaUrl_backup: null,
                        usageCount: 0,
                        lastUsed: null,
                        tags: ex.tags || [],
                        source: 'exercisedb'
                    });
                    imported++;
                } catch (err) {
                    console.error(`Error importing ${ex.name}:`, err);
                    errors++;
                }

                // Progress update every 100 exercises
                if (imported % 100 === 0) {
                    console.log(`Importados: ${imported}/${exercises.length}`);
                }
            }

            alert(`✅ Importación completada!\n\n• Importados: ${imported}\n• Errores: ${errors}`);

            // Refresh exercise list
            TrainingDB.exercises.getAll().then(setAllExercises);

        } catch (err) {
            console.error('Import error:', err);
            alert('Error al importar: ' + err.message);
        } finally {
            setIsSaving(false);
            event.target.value = ''; // Reset file input
        }
    };

    const toggleOnlineExpansion = (exId) => {
        setExpandedOnlineEx(expandedOnlineEx === exId ? null : exId);
    };

    const handleImportOnlineExercise = async (onlineEx) => {
        if (isSaving) return;
        console.log('IMPORTING FROM ONLINE:', onlineEx);
        setIsSaving(true);
        try {
            let finalGifUrl = '';

            try {
                // 1. Download GIF from ExerciseDB (with a small retry for stability)
                let gifBlob;
                try {
                    gifBlob = await ExerciseAPI.fetchImageBlob(onlineEx.id);
                } catch (e) {
                    console.warn('First fetch failed, retrying in 1s...', e);
                    await new Promise(r => setTimeout(r, 1000));
                    gifBlob = await ExerciseAPI.fetchImageBlob(onlineEx.id);
                }

                // 2. Upload to ImgBB for permanent storage
                try {
                    finalGifUrl = await uploadToImgBB(gifBlob);
                } catch (imgbbErr) {
                    console.warn('ImgBB Upload failed, using original preview URL:', imgbbErr);
                    finalGifUrl = onlineEx.mediaUrl || '';
                }
            } catch (gifErr) {
                console.error('GIF permanent storage process failed:', gifErr);
                finalGifUrl = onlineEx.mediaUrl || ''; // Fallback to original URL (with API key)
            }

            // 3. Translate content to Spanish
            let translatedName = onlineEx.name;
            let translatedDescription = (onlineEx.instructions || []).join('\n');

            try {
                [translatedName, translatedDescription] = await Promise.all([
                    ExerciseAPI.translateText(onlineEx.name),
                    ExerciseAPI.translateText(translatedDescription)
                ]);
            } catch (trErr) {
                console.error('Translation failed, using original English text:', trErr);
            }

            // Map ExerciseDB to 2BeFitHub structure
            const prefilledData = {
                name: ExerciseAPI.toSentenceCase(translatedName || 'Sin nombre'),
                pattern: ExerciseAPI.mapBodyPartToPattern(onlineEx.bodyPart || ''),
                equipment: (onlineEx.equipment || 'Ninguno').charAt(0).toUpperCase() + (onlineEx.equipment || 'Ninguno').slice(1),
                level: 'Intermedio', // Default
                quality: onlineEx.bodyPart === 'cardio' ? 'E' : 'Fuerza', // AUTO-DETECT CARDIO
                loadable: onlineEx.equipment !== 'body weight', // If not bodyweight, consider it loadable
                mediaUrl: finalGifUrl,
                imageStart: '',
                imageEnd: '',
                youtubeUrl: '',
                description: ExerciseAPI.postProcessSpanish(translatedDescription || 'Sin descripción'),
                tags: [
                    onlineEx.target,
                    onlineEx.bodyPart,
                    ...(onlineEx.secondaryMuscles || [])
                ].filter(Boolean)
            };

            // Instead of saving directly, we open the Quick Creator with pre-filled fields
            setCreationData(prefilledData);
            setQuickCreatorOpen(true);
            if (exercisePickerOpen) setExercisePickerOpen(false); // Close the picker if it was open
        } catch (error) {
            console.error('Error importing exercise details:', error);
            alert('Error al preparar importación: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const addBlock = () => {
        const id = crypto.randomUUID();
        setBlocks([...blocks, {
            id,
            stableId: id, // First generation stable ID
            name: `Bloque ${blocks.length + 1}`,
            exercises: []
        }]);
    };

    const importModule = (moduleData) => {
        setBlocks([...blocks, {
            ...moduleData,
            id: crypto.randomUUID(),
            stableId: moduleData.stableId || moduleData.id, // Preserve previous or set current as stable
            name: `${moduleData.name} (Imp)`,
            // Ensure exercises get new IDs
            exercises: (moduleData.exercises || []).map(e => ({
                ...e,
                id: crypto.randomUUID(),
                // Ensure config exists
                config: e.config || { protocol: 'REPS', sets: [] }
            }))
        }]);
        setModulePickerOpen(false);
    };

    const handleLoadSession = async (session) => {
        if (window.confirm('Cargar esta sesión reemplazará la actual. ¿Estás seguro?')) {
            let processedBlocks = JSON.parse(JSON.stringify(session.blocks || []));

            // HYDRATION LOGIC: Repair legacy exercises missing data
            try {
                // Combine local library and global catalog for a complete search pool
                // Library exercises come first to prioritize user's custom/perfectly-saved versions
                let catalog = [...allExercises, ...bulkExercises];

                if (bulkExercises.length === 0) {
                    console.log('Fetching catalog to hydrate legacy session...');
                    const fetchedBulk = await ExerciseAPI.fetchFullCatalog();
                    setBulkExercises(fetchedBulk);
                    catalog = [...allExercises, ...fetchedBulk];
                }

                // Map through blocks and exercises
                const processedBlockPromises = processedBlocks.map(async block => ({
                    ...block,
                    stableId: block.stableId || block.id, // Backfill stableId if missing
                    exercises: await Promise.all(block.exercises.map(async ex => {
                        // Attempt to find full data in catalog by ID or Name
                        // We also check name_es for better matching
                        const fullData = catalog.find(c =>
                            c.id === ex.id ||
                            c.id === `edb_${ex.id}` ||
                            (ex.name && c.name?.toLowerCase() === ex.name?.toLowerCase()) ||
                            (ex.name_es && c.name_es?.toLowerCase() === ex.name_es?.toLowerCase())
                        );

                        // Base merged data
                        // We prioritize catalog data if description or name_es is missing in the session
                        let merged = {
                            ...ex,
                            id: fullData?.id || ex.id,
                            name_es: ex.name_es || fullData?.name_es || '',
                            instructions: (ex.instructions?.length > 0 ? ex.instructions : fullData?.instructions) || [],
                            instructions_es: (ex.instructions_es?.length > 0 ? ex.instructions_es : fullData?.instructions_es) || [],
                            description: ex.description || fullData?.description || (fullData?.instructions_es?.length > 0 ? fullData.instructions_es.join(' ') : ''),
                            mediaUrl: ex.mediaUrl || fullData?.mediaUrl || fullData?.gifUrl || ''
                        };

                        // Helper to detect if a string is likely Spanish (manual heuristic)
                        const isLikelySpanish = (text) => {
                            if (!text) return false;
                            // Check for common Spanish characters
                            if (/[áéíóúÁÉÍÓÚñÑ]/.test(text)) return true;
                            // Check for common Spanish stop words
                            const commonSpanishWords = ['con', 'de', 'el', 'la', 'un', 'una', 'en', 'por', 'sobre', 'para'];
                            const words = text.toLowerCase().split(/\s+/);
                            return words.some(w => commonSpanishWords.includes(w));
                        };

                        // ON-THE-FLY TRANSLATION - ONLY if we don't have a Spanish name AND original name doesn't look Spanish
                        if (!merged.name_es && merged.name && !isLikelySpanish(merged.name)) {
                            try {
                                console.log(`[Hydration] Translating name: ${merged.name}`);
                                merged.name_es = await ExerciseAPI.translateText(merged.name);
                                // Also translate instructions if missing
                                if ((!merged.instructions_es || merged.instructions_es.length === 0) && merged.instructions?.length > 0) {
                                    const combinedInstr = merged.instructions.join('\n');
                                    const translatedInstr = await ExerciseAPI.translateText(combinedInstr);
                                    merged.instructions_es = translatedInstr.split('\n');
                                }
                            } catch (error) {
                                console.warn('Translation failed for:', merged.name);
                            }
                        } else if (!merged.name_es && merged.name) {
                            // If it's already Spanish or we can't translate, set name_es to name
                            merged.name_es = merged.name;
                        }

                        // Ensure description is NEVER empty if we have instructions_es
                        if (!merged.description && merged.instructions_es?.length > 0) {
                            merged.description = merged.instructions_es.join(' ');
                        }

                        return merged;
                    }))
                }));

                processedBlocks = await Promise.all(processedBlockPromises);
                console.log('Session hydrated and translated successfully.');
            } catch (err) {
                console.warn('Auto-hydration failed, loading session as-is:', err);
            }

            setSessionTitle(session.name);
            setSessionGroup(session.group || '');
            setSessionDescription(session.description || '');
            setSessionType(session.type || 'LIBRE');
            setIsCardio(session.isCardio || false);
            setBlocks(processedBlocks);
            setMainView('editor');
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (window.confirm('¿Eliminar esta sesión permanentemente?')) {
            try {
                await TrainingDB.sessions.delete(sessionId);
                setAllSessions(prev => prev.filter(s => s.id !== sessionId));
            } catch (error) {
                console.error('Error deleting session:', error);
                alert('Error al eliminar sesión');
            }
        }
    };

    const handleQuickMove = async (sessionId, newGroupName) => {
        try {
            setIsMoving(true);
            await TrainingDB.sessions.update(sessionId, { group: newGroupName });
            // Update local state
            setAllSessions(prev => prev.map(s => s.id === sessionId ? { ...s, group: newGroupName } : s));
            setMovingSession(null);
        } catch (error) {
            console.error('Error moving session:', error);
            alert('Error al mover la sesión');
        } finally {
            setIsMoving(false);
        }
    };

    const handleClearSession = () => {
        if (window.confirm('¿Estás seguro de querer borrar toda la sesión actual?')) {
            setBlocks([{ id: crypto.randomUUID(), name: 'Bloque 1', exercises: [] }]);
            setSessionTitle('Nueva Sesión');
            setSessionGroup('');
            setSessionDescription('');
            setSessionType('LIBRE');
            // Reset active indices to prevent crash on reading deleted blocks
            setActiveBlockIdx(null);
            setActiveExIdx(null);
            setActiveExerciseObj(null);
        }
    };

    // PDP Protocol Templates
    const PDP_TEMPLATES = {
        'PDP-T': [
            { name: 'BOOST - Activación', timeCap: 240, description: '4 min - Activación dinámica (Superserie)' },
            { name: 'BASE - Fuerza', timeCap: 240, description: '4 min - Fuerza fundamental (Solo)' },
            { name: 'BUILD A - Capacidad', timeCap: 300, description: '5 min - Construcción capacidad (Solo)' },
            { name: 'BUILD B - Capacidad', timeCap: 300, description: '5 min - Construcción capacidad (Solo)' },
            { name: 'BURN A - Acondicionamiento', timeCap: 360, description: '6 min - Metabólico (Superserie)' },
            { name: 'BURN B - Acondicionamiento', timeCap: 360, description: '6 min - Metabólico (Superserie)' }
        ],
        'PDP-R': [
            { name: 'BOOST - Activación', targetReps: 30, description: '30 reps - Activación dinámica (Superserie)' },
            { name: 'BASE - Fuerza', targetReps: 30, description: '30 reps - Fuerza fundamental (Solo)' },
            { name: 'BUILD A - Capacidad', targetReps: 40, description: '40 reps - Construcción capacidad (Solo)' },
            { name: 'BUILD B - Capacidad', targetReps: 40, description: '40 reps - Construcción capacidad (Solo)' },
            { name: 'BURN A - Acondicionamiento', targetReps: 60, description: '60 reps - Metabólico (Superserie)' },
            { name: 'BURN B - Acondicionamiento', targetReps: 60, description: '60 reps - Metabólico (Superserie)' }
        ],
        'PDP-E': [
            { name: 'BOOST - Activación', emomMinutes: 4, description: 'EMOM 4 min - Superserie A+B' },
            { name: 'BASE - Fuerza', emomMinutes: 4, description: 'EMOM 4 min - 5-6 reps estrictas' },
            { name: 'BUILD A - Capacidad', emomMinutes: 5, description: 'EMOM 5 min - 8 reps/min' },
            { name: 'BUILD B - Capacidad', emomMinutes: 5, description: 'EMOM 5 min - 8 reps/min' },
            { name: 'BURN A - Acondicionamiento', emomMinutes: 6, description: 'EMOM 6 min - Biseries (10+10)' },
            { name: 'BURN B - Acondicionamiento', emomMinutes: 6, description: 'EMOM 6 min - Biseries (10+10)' }
        ]
    };

    const PDP_DESCRIPTIONS = {
        'PDP-T': 'Progressive Density Program bajo Time Cap. Formato de trabajo: máxima densidad en tiempo fijo.\n\n• BOOST (4min): Superserie de activación alternando 2 ejercicios.\n• BASE (4min): Trabajo de fuerza en 1 ejercicio principal.\n• BUILD A/B (5min c/u): Trabajo de capacidad en ejercicios por separado.\n• BURN A/B (6min c/u): 2 bloques de acondicionamiento tipo AMRAP en superseries.',

        'PDP-R': 'Progressive Density Program basado en Reps. Formato de trabajo: completar reps target en el menor tiempo posible.\n\n• BOOST (30 reps): Superserie compartiendo reps (15+15).\n• BASE (30 reps): Trabajo de fuerza en 1 ejercicio solo.\n• BUILD A/B (40 reps c/u): Capacidad en ejercicios por separado.\n• BURN A/B (60 reps c/u): Acondicionamiento en superseries (60 reps por ejercicio).',

        'PDP-E': 'Progressive Density Program en formato EMOM. Formato de trabajo: Every Minute On the Minute.\n\n• BOOST (4min): Superserie A+B (6 reps/min).\n• BASE (4min): 1 Ejercicio (6 reps/min).\n• BUILD A/B (5min c/u): 1 Ejercicio (8 reps/min).\n• BURN A/B (6min c/u): Superseries (10+10 reps/min).'
    };

    // --- PDP Protocol Constants & Helpers ---
    const OFFICIAL_BLOCK_VALUES = {
        BOOST: { time: 240, reps: 30, emomMin: 4 },
        BASE: { time: 240, reps: 30, emomMin: 4 },
        BUILD: { time: 300, reps: 40, emomMin: 5 },
        BURN: { time: 360, reps: 60, emomMin: 6 }
    };

    const determineBlockType = (name = '', idx = 0) => {
        const upperName = name.toUpperCase();
        if (upperName.includes('BOOST')) return 'BOOST';
        if (upperName.includes('BASE')) return 'BASE';
        if (upperName.includes('BUILD')) return 'BUILD';
        if (upperName.includes('BURN')) return 'BURN';

        // Fallback by index if name doesn't match
        const defaultTypes = ['BOOST', 'BASE', 'BUILD', 'BUILD', 'BURN', 'BURN'];
        return defaultTypes[idx] || 'BASE';
    };

    const createPlaceholderExercise = (blockType, exIdx, protocolType) => {
        const values = OFFICIAL_BLOCK_VALUES[blockType] || OFFICIAL_BLOCK_VALUES.BASE;
        const baseConfig = {
            volType: protocolType === 'PDP-T' ? 'TIME' : 'REPS',
            intType: 'RIR',
            sets: []
        };

        // Define sets based on protocol
        if (protocolType === 'PDP-T') {
            let timePerExercise = values.time;
            if (blockType === 'BOOST') timePerExercise = Math.floor(values.time / 2);
            baseConfig.sets = [{ reps: String(timePerExercise), rir: '2-3', rest: '0' }];
            if (blockType === 'BURN') baseConfig.sharedTime = true;
        } else if (protocolType === 'PDP-R') {
            let repsPerExercise = values.reps;
            if (blockType === 'BOOST') repsPerExercise = Math.floor(values.reps / 2);
            baseConfig.sets = [{ reps: String(repsPerExercise), rir: '2-3', rest: '0' }];
        } else if (protocolType === 'PDP-E') {
            const numSets = values.emomMin;
            let repsPerRound = 6;
            if (blockType === 'BUILD') repsPerRound = 8;
            if (blockType === 'BURN') repsPerRound = 10;
            baseConfig.sets = Array(numSets).fill(null).map(() => ({ reps: String(repsPerRound), rir: '2-3', rest: '0' }));
            baseConfig.isEMOM = true;
        }

        return {
            id: crypto.randomUUID(),
            name: `Ejercicio ${exIdx + 1}`,
            type: 'EXERCISE',
            pattern: 'Global',
            quality: 'Fuerza',
            config: baseConfig,
            isGrouped: (blockType === 'BOOST' || blockType === 'BURN') && exIdx % 2 === 1,
            mediaUrl: '', imageStart: '', imageEnd: ''
        };
    };

    const applyTemplate = (protocolType) => {
        const template = PDP_TEMPLATES[protocolType];
        if (!template) return;

        // Set protocol description and expand
        setSessionDescription(PDP_DESCRIPTIONS[protocolType] || '');
        setSessionType(protocolType);
        setDescriptionExpanded(true);


        // 1. Collect existing exercises to reuse
        let availableExercises = [];
        if (blocks && blocks.length > 0) {
            // Flatten blocks and collect exercises
            availableExercises = blocks.flatMap(b => b.exercises);
        }
        let exIterator = 0;

        const newBlocks = template.map((blockDef, blockIdx) => {
            const blockTypes = ['BOOST', 'BASE', 'BUILD', 'BUILD', 'BURN', 'BURN'];
            const blockType = blockTypes[blockIdx];

            // BOOST: 2 exercises (superseries)
            // BASE: 1 exercise (solo)
            // BUILD A/B: 1 exercise (solo - changed from 2)
            // BURN A/B: 2 exercises (superseries)
            let numExercises;
            if (blockType === 'BOOST') numExercises = 2;
            else if (blockType === 'BASE') numExercises = 1;
            else if (blockType === 'BUILD') numExercises = 1; // CHANGED: Now single exercise per Build block
            else if (blockType === 'BURN') numExercises = 2;
            return {
                id: crypto.randomUUID(),
                name: blockDef.name,
                exercises: Array(numExercises).fill(null).map((_, i) => {
                    // Create base placeholder with correct config for new protocol
                    const type = determineBlockType(blockDef.name, blockIdx);
                    const placeholder = createPlaceholderExercise(type, i, protocolType);

                    // If we have an existing exercise, merge it
                    if (exIterator < availableExercises.length) {
                        const existing = availableExercises[exIterator];
                        exIterator++;

                        return {
                            ...existing,
                            id: crypto.randomUUID(), // New ID for new structure
                            config: placeholder.config, // OVERWRITE config to match new protocol (Critical!)
                            isGrouped: placeholder.isGrouped, // Update grouping for new structure
                            // Keep identity properties:
                            name: existing.name || placeholder.name,
                            mediaUrl: existing.mediaUrl || placeholder.mediaUrl,
                            youtubeUrl: existing.youtubeUrl || '',
                            imageStart: existing.imageStart || '',
                            imageEnd: existing.imageEnd || '',
                            description: existing.description || '',
                            pattern: existing.pattern || placeholder.pattern,
                            equipment: existing.equipment || placeholder.equipment
                        };
                    }

                    return placeholder;
                }),
                description: blockDef.description,
                protocol: protocolType,
                params: {
                    timeCap: blockDef.timeCap,
                    targetReps: blockDef.targetReps,
                    emomMinutes: blockDef.emomMinutes
                }
            };
        });

        setBlocks(newBlocks);
        setSessionTitle(`Sesión ${protocolType}`);
    };

    const applyCardioTemplate = () => {
        setSessionDescription('Sesión de trabajo cardiovascular.');
        setSessionType('CARDIO');
        setIsCardio(true);
        setDescriptionExpanded(true);

        // If session already has content, JUST mark as cardio and return
        if (blocks.length > 0 && blocks.some(b => b.exercises.length > 0)) {
            setSessionTitle(prev => prev.includes('Nueva Sesión') ? 'Nueva Sesión Cardio' : prev);
            return;
        }

        const newBlocks = [{
            id: crypto.randomUUID(),
            name: 'Bloque de Cardio',
            exercises: [{
                id: crypto.randomUUID(),
                name: 'Carrera / Bici / Remo',
                type: 'EXERCISE',
                pattern: 'Global',
                quality: 'E', // Energía / Cardio
                config: { volType: 'TIME', intType: 'RPE', sets: [{ reps: '600', rpe: '6', rest: '0' }] },
                isGrouped: false,
                mediaUrl: '', imageStart: '', imageEnd: ''
            }],
            description: 'Trabajo continuo u oficial de la sesión.',
            protocol: 'LIBRE',
            params: {}
        }];

        setBlocks(newBlocks);
        setSessionTitle('Nueva Sesión Cardio');
    };

    const saveModuleToDB = async (block) => {
        const moduleName = prompt('Nombre del Módulo a guardar:', block.name);
        if (!moduleName) return;

        try {
            await TrainingDB.modules.create({
                name: moduleName,
                exercises: block.exercises,
                protocol: 'HYBRID', // auto-detect?
                createdAt: new Date().toISOString()
            });
            alert('Módulo guardado correctamente en la librería.');
            // Refresh modules
            TrainingDB.modules.getAll().then(setAllModules);
        } catch (e) {
            console.error(e);
            alert('Error al guardar el módulo.');
        }
    };

    const handleBlockProtocolUpdate = (blockIdx, newProtocol) => {
        const block = blocks[blockIdx];
        if (!block) return;

        // If switching to LIBRE, just update protocol but keep exercises
        if (newProtocol === 'LIBRE') {
            const newBlocks = [...blocks];
            newBlocks[blockIdx] = { ...block, protocol: newProtocol, params: {} };
            setBlocks(newBlocks);
            return;
        }

        // Identify block type to apply correct preset
        const blockType = determineBlockType(block.name, blockIdx);
        const protocolValues = OFFICIAL_BLOCK_VALUES[blockType] || OFFICIAL_BLOCK_VALUES.BASE;

        // If block has exercises, ask for confirmation before injecting presets
        if (block.exercises.length > 0) {
            const confirmOverwrite = window.confirm(
                `¿Deseas aplicar el preset de ${newProtocol}? \n\nEsto actualizará la configuración (series/reps/rpe) de los ejercicios actuales para adaptarlos al protocolo.`
            );
            if (!confirmOverwrite) {
                // Just update protocol without injecting exercises
                const newBlocks = [...blocks];
                newBlocks[blockIdx] = { ...block, protocol: newProtocol };
                setBlocks(newBlocks);
                return;
            }
        }

        // Maintain existing exercises but update their config and grouping
        const existingExercises = block.exercises || [];
        let numPlaceholderExercises = 1;
        if (blockType === 'BOOST' || blockType === 'BURN') numPlaceholderExercises = 2;

        const newExercises = Array(Math.max(numPlaceholderExercises, existingExercises.length)).fill(null).map((_, i) => {
            const placeholder = createPlaceholderExercise(blockType, i, newProtocol);
            if (i < existingExercises.length) {
                return {
                    ...existingExercises[i],
                    config: placeholder.config, // Preservar identidad, aplicar configuración protocolaria
                    isGrouped: placeholder.isGrouped
                };
            }
            return placeholder;
        });

        const newBlocks = [...blocks];
        newBlocks[blockIdx] = {
            ...block,
            protocol: newProtocol,
            exercises: newExercises,
            params: {
                timeCap: protocolValues.time,
                targetReps: protocolValues.reps,
                emomMinutes: protocolValues.emomMin
            }
        };

        setBlocks(newBlocks);
    };

    const updateBlock = (idx, newData) => {
        const newBlocks = [...blocks];
        newBlocks[idx] = newData;
        setBlocks(newBlocks);
    };

    const handleAddExerciseRequest = (blockIdx) => {
        setActiveBlockIdxForPicker(blockIdx);
        setExercisePickerOpen(true);
    };

    const handleExerciseSelect = (ex) => {
        const newBlocks = [...blocks];

        if (swapMode && swapTarget) {
            // Swap mode: Replace exercise but keep config
            const { blockIdx, exIdx, config, isGrouped } = swapTarget;
            newBlocks[blockIdx].exercises[exIdx] = {
                ...ex,
                id: crypto.randomUUID(),
                config: config, // Preserve original config
                isGrouped: isGrouped, // Preserve grouping
                // Explicit media mapping
                mediaUrl: ex.mediaUrl || ex.gifUrl || '',
                gifUrl: ex.gifUrl || ex.mediaUrl || ''
            };
            setSwapMode(false);
            setSwapTarget(null);
        } else if (activeBlockIdxForPicker !== null) {
            // Normal mode: Add new exercise to specific block
            newBlocks[activeBlockIdxForPicker].exercises.push({
                ...ex,
                id: crypto.randomUUID(),
                name: ex.name || '',
                name_es: ex.name_es || ex.nameEs || ex.name || '',
                description: ex.description || ex.descriptionEs || ex.description_es || (ex.instructions_es?.length > 0 ? ex.instructions_es.join(' ') : ''),
                instructions: ex.instructions || [],
                instructions_es: ex.instructions_es || [],
                config: { volType: 'REPS', intType: 'RIR', sets: [] },
                isGrouped: false,
                // Explicit media mapping
                mediaUrl: ex.mediaUrl || ex.gifUrl || '',
                gifUrl: ex.gifUrl || ex.mediaUrl || ''
            });
        }

        setBlocks(newBlocks);
        setExercisePickerOpen(false);
        setPickerSearch('');
    };

    const handleStartCreation = (initialGroup = '') => {
        setCreationData({
            name: pickerSearch || '',
            group: initialGroup || '',
            pattern: 'Squat',
            equipment: 'Ninguno (Peso Corporal)',
            level: 'Intermedio',
            quality: 'Fuerza',
            loadable: false, // Default: not loadable
            mediaUrl: '', imageStart: '', imageEnd: '', // New Fields
            youtubeUrl: '', description: '',
            tags: []
        });
        setQuickCreatorOpen(true);
    };

    const handleCreateAndSelect = async () => {
        if (!creationData.name) return;

        // Final sanitization to prevent Firestore "undefined" errors
        const sanitizedData = JSON.parse(JSON.stringify({
            name: (creationData.name || '').trim(),
            group: creationData.group || '',
            pattern: creationData.pattern || 'Global',
            equipment: creationData.equipment || 'Ninguno',
            level: creationData.level || 'Intermedio',
            quality: creationData.quality || 'Fuerza',
            loadable: !!creationData.loadable,
            mediaUrl: creationData.mediaUrl || '',
            imageStart: creationData.imageStart || '',
            imageEnd: creationData.imageEnd || '',
            youtubeUrl: creationData.youtubeUrl || '',
            description: creationData.description || '',
            tags: creationData.tags || []
        }, (key, value) => value === undefined ? null : value));

        console.log('SAVING EXERCISE:', sanitizedData);

        try {
            const newExRef = await TrainingDB.exercises.create(sanitizedData);

            // Select it immediately
            const exData = {
                id: newExRef.id,
                ...sanitizedData
            };

            setAllExercises(prev => [...prev, exData]);

            // CONTEXT CHECK: Only inject into session if we were in the editor/picker flow
            // If in Library, we just want to save it to our collection.
            if (mainView !== 'library' && activeBlockIdxForPicker !== null) {
                handleExerciseSelect(exData);
            } else {
                console.log('Exercise saved to library (no session insertion)');
            }

            setQuickCreatorOpen(false);
        } catch (error) {
            console.error('SAVE ERROR:', error);
            alert('Error al guardar ejercicio: ' + (error.message || 'Error desconocido'));
        }
    };

    const handleOpenConfig = (blockIdx, exIdx) => {
        const ex = blocks[blockIdx].exercises[exIdx];
        setActiveExerciseObj({ ...ex });
        setActiveBlockIdx(blockIdx);
        setActiveExIdx(exIdx);
        setConfigDrawerOpen(true);
    };

    const handleSaveSession = async () => {
        if (isSaving) return;

        // Basic validation
        if (!sessionTitle.trim()) {
            alert('Por favor, indica un título para la sesión');
            return;
        }

        const exercisesCount = blocks.reduce((acc, block) => acc + block.exercises.length, 0);
        if (exercisesCount === 0) {
            alert('La sesión debe tener al menos un ejercicio');
            return;
        }

        // Calculate Metadata
        const blockCount = blocks.length;

        let totalDurationMin = 0;
        blocks.forEach(block => {
            // Priority 1: Time Cap (PDP-T)
            if (block.params?.timeCap) {
                totalDurationMin += (parseInt(block.params.timeCap) / 60);
            }
            // Priority 2: EMOM (PDP-E)
            else if (block.params?.emomMinutes) {
                totalDurationMin += parseInt(block.params.emomMinutes);
            }
            // Priority 3: Fallback estimate for Reps/Other (approx 5 min/block)
            else {
                totalDurationMin += 5;
            }
        });

        const calculatedDuration = Math.ceil(totalDurationMin);

        setIsSaving(true);
        try {
            // Helper to remove undefined values recursively
            const sanitizeData = (obj) => {
                return JSON.parse(JSON.stringify(obj, (key, value) => {
                    return value === undefined ? null : value;
                }));
            };

            const sessionData = sanitizeData({
                name: sessionTitle,
                group: sessionGroup,
                description: sessionDescription,
                type: sessionType,
                isCardio: isCardio,
                duration: calculatedDuration, // New Field
                blockCount: blockCount,       // New Field
                totalExercises: exercisesCount, // New Field

                blocks: blocks.map(block => ({
                    id: block.id,
                    name: block.name,
                    description: block.description || '',
                    protocol: block.protocol || sessionType || 'LIBRE',
                    ...(block.params ? { params: block.params } : {}),
                    exercises: block.exercises.map(ex => ({
                        // Core identity
                        id: ex.id,
                        name: ex.name,
                        name_es: ex.name_es || ex.name, // Ensure Spanish name is persisted
                        type: ex.type || 'EXERCISE', // Important for REST
                        duration: ex.duration || 0,   // Important for REST

                        pattern: ex.pattern || 'Global',
                        quality: ex.quality || 'Fuerza',
                        equipment: ex.equipment || '',

                        // Configuration
                        config: ex.config || {},
                        isGrouped: ex.isGrouped || false,

                        // Media - preserve ALL sources for GIF playback
                        mediaUrl: ex.mediaUrl || ex.gifUrl || '',
                        gifUrl: ex.gifUrl || ex.mediaUrl || '',
                        imageStart: ex.imageStart || '',
                        imageEnd: ex.imageEnd || '',
                        youtubeUrl: ex.youtubeUrl || '',

                        // Content - preserve description and instructions for detail view
                        description: ex.description || '',
                        instructions: ex.instructions || [],
                        instructions_es: ex.instructions_es || [],
                        notes: ex.notes || '',
                        tags: ex.tags || []
                    }))
                }))
            });

            if (embeddedMode) {
                await onSave(sessionData);
            } else {
                await TrainingDB.sessions.create(sessionData);

                // Refresh list immediately
                const updatedSessions = await TrainingDB.sessions.getAll();
                setAllSessions(updatedSessions);

                alert('🚀 Sesión guardada con éxito');
            }
            // Reset dirty state after successful save
            setInitialState(JSON.stringify({
                name: sessionTitle,
                group: sessionGroup,
                description: sessionDescription,
                isCardio: isCardio,
                blocks: blocks
            }));
            setIsDirty(false);

        } catch (error) {
            console.error('Error saving session:', error);
            alert('❌ Error al guardar la sesión: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const data = await TrainingDB.groups.getAll();
            setAllGroups(data);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const handleCreateGroup = async (type = 'SESSION') => {
        if (!newGroupName.trim()) return;
        try {
            setIsCreatingGroup(true);
            // Polymorphic group creation: defaults to SESSION if not specified
            await TrainingDB.groups.create({
                name: newGroupName.trim(),
                type: type
            });
            setNewGroupName('');
            await fetchGroups();
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Error al crear grupo');
        } finally {
            setIsCreatingGroup(false);
        }
    };

    const handleDeleteGroup = async (groupId, groupName, type = 'SESSION') => {
        let hasDependencies = false;

        if (type === 'SESSION') {
            hasDependencies = allSessions.some(s => s.group === groupName);
        } else {
            hasDependencies = allExercises.some(ex => ex.group === groupName);
        }

        if (hasDependencies) {
            alert(`No se puede eliminar un grupo que contiene ${type === 'SESSION' ? 'sesiones' : 'ejercicios'}. Primero mueve o elimina los elementos.`);
            return;
        }

        if (window.confirm(`¿Seguro que quieres eliminar el grupo "${groupName}"?`)) {
            try {
                await TrainingDB.groups.delete(groupId);
                await fetchGroups();
            } catch (error) {
                console.error('Error deleting group:', error);
                alert('Error al eliminar grupo');
            }
        }
    };

    const handleQuickMoveExercise = async (exerciseId, newGroupName) => {
        try {
            setIsMoving(true);
            await TrainingDB.exercises.update(exerciseId, { group: newGroupName });

            // Optimistic update
            setAllExercises(prev => prev.map(ex =>
                ex.id === exerciseId ? { ...ex, group: newGroupName } : ex
            ));

            setMovingExercise(null); // Close modal
        } catch (error) {
            console.error('Error moving exercise:', error);
            alert('Error al mover el ejercicio');
        } finally {
            setIsMoving(false);
        }
    };

    const handleSaveConfig = (updatedEx) => {
        if (activeBlockIdx === null || activeExIdx === null) return;
        const newBlocks = [...blocks];
        newBlocks[activeBlockIdx].exercises[activeExIdx] = updatedEx;
        setBlocks(newBlocks);
        // Drawer closes automatically via its internal logic or we can ensure it here
        setConfigDrawerOpen(false);
    };

    const handleSwapExercise = (blockIdx, exIdx) => {
        const ex = blocks[blockIdx].exercises[exIdx];
        setSwapTarget({
            blockIdx,
            exIdx,
            config: ex.config,
            isGrouped: ex.isGrouped
        });
        setSwapMode(true);
        setExercisePickerOpen(true);
    };

    // Library Drag & Drop Handler
    const handleLibraryDragEnd = (e, info, exercise) => {
        // Detect drop target using pointer coordinates
        const elements = document.elementsFromPoint(info.point.x, info.point.y);
        const blockElement = elements.find(el => el.hasAttribute('data-block-id'));

        if (blockElement) {
            const blockIdx = parseInt(blockElement.getAttribute('data-block-id'));
            if (!isNaN(blockIdx) && blocks[blockIdx]) {
                // Add exercise to this block
                const newEx = {
                    ...exercise,
                    id: crypto.randomUUID(),
                    // Ensure fresh config
                    config: exercise.config || { volType: 'REPS', intType: 'RIR', sets: [] },
                    isGrouped: false,
                    // Preserve media
                    mediaUrl: exercise.mediaUrl || exercise.gifUrl || '',
                    imageStart: exercise.imageStart || '',
                    imageEnd: exercise.imageEnd || '',
                    youtubeUrl: exercise.youtubeUrl || ''
                };

                const newBlocks = [...blocks];
                newBlocks[blockIdx].exercises.push(newEx);
                setBlocks(newBlocks);

                // Optional: Provide feedback or flash the block
            }
        }
        setIsLibraryDragging(false);
    };

    // Library CRUD Handlers
    const handleLibraryEdit = (ex) => {
        setLibraryEditExercise(ex);
        setLibraryEditDrawerOpen(true);
    };

    const handleLibrarySave = async (formData) => {
        if (!libraryEditExercise) return;
        try {
            await TrainingDB.exercises.update(libraryEditExercise.id, formData);
            setAllExercises(prev => prev.map(ex => ex.id === libraryEditExercise.id ? { ...ex, ...formData } : ex));
            setLibraryEditDrawerOpen(false);
            setLibraryEditExercise(null);
        } catch (error) {
            console.error('Error updating exercise:', error);
            throw error;
        }
    };

    const handleLibraryDelete = async (exId) => {
        if (!window.confirm('¿Seguro que quieres eliminar este ejercicio?')) return;
        try {
            await TrainingDB.exercises.delete(exId);
            setAllExercises(prev => prev.filter(ex => ex.id !== exId));
        } catch (error) {
            console.error('Error deleting exercise:', error);
            alert('Error al eliminar: ' + error.message);
        }
    };

    const handleLibraryDuplicate = async (ex) => {
        try {
            const { id, ...data } = ex;
            const newEx = await TrainingDB.exercises.create({ ...data, name: `${data.name} (Copia)` });
            setAllExercises(prev => [...prev, { id: newEx.id, ...data, name: `${data.name} (Copia)` }]);
        } catch (error) {
            console.error('Error duplicating exercise:', error);
            alert('Error al duplicar: ' + error.message);
        }
    };

    // Filter exercises for unified view
    const filteredLibraryExercises = filterExerciseList(allExercises, pickerSearch, pickerFilter);

    return (
        <>
            <div className="w-full h-full md:max-w-[95vw] md:h-[92vh] md:mx-auto bg-white shadow-none md:shadow-2xl md:rounded-3xl border-x-0 md:border border-slate-200 flex flex-col overflow-visible relative font-sans transition-all">

                {/* MODE SWITCHER */}
                {!embeddedMode && (
                    <div className="flex justify-center p-2 bg-slate-900 border-b border-slate-800 shrink-0 z-20">
                        <div className="flex bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setGlobalMode('TRAINING')}
                                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${globalMode === 'TRAINING' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Dumbbell size={14} /> Entreno
                            </button>
                            <button
                                onClick={() => setGlobalMode('NUTRITION')}
                                className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${globalMode === 'NUTRITION' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                            >
                                <Utensils size={14} /> Nutrición
                            </button>
                        </div>
                    </div>
                )}

                {globalMode === 'TRAINING' && (
                    <>
                        {/* Main Navigation Tabs - Hide in Embedded Mode or Mobile Landscape */}
                        {!embeddedMode && !isMobileLandscape && (
                            <div className="bg-slate-900 text-white p-3 pt-4 shrink-0 shadow-lg z-10">
                                <div className="flex bg-slate-800/50 p-1 rounded-2xl gap-1">
                                    {[
                                        { id: 'editor', label: 'Editor', icon: <Dumbbell size={16} /> },
                                        { id: 'library', label: 'Biblioteca', icon: <Library size={16} /> },
                                        { id: 'sessions', label: 'Sesiones', icon: <List size={16} /> }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setMainView(tab.id)}
                                            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${mainView === tab.id
                                                ? 'bg-white text-slate-900 shadow-md transform scale-[1.02]'
                                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            {tab.icon}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Embedded Header with Close Button */}
                        {embeddedMode && (
                            <div className={`bg-slate-900 text-white shrink-0 flex justify-between items-center transition-all ${isMobileLandscape ? 'p-1 px-4' : 'p-3'}`}>
                                <h3 className={`font-bold flex items-center gap-2 transition-all ${isMobileLandscape ? 'text-[10px]' : 'text-sm'}`}>
                                    <Edit2 size={isMobileLandscape ? 12 : 16} /> Editar Sesión
                                    {(isDirty || exDrawerDirty) && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Sin guardar</span>}
                                </h3>
                                <button
                                    onClick={() => {
                                        if (isDirty || exDrawerDirty) {
                                            if (window.confirm('Tienes cambios sin guardar en la sesión. ¿Seguro que quieres cerrar?')) {
                                                onClose();
                                            }
                                        } else {
                                            onClose();
                                        }
                                    }}
                                    className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        )}

                        {/* Session Title - Only show in editor mode and not in extreme landscape mobile unless we compact it */}
                        {mainView === 'editor' && (
                            <div className={`bg-white border-b border-slate-100 px-2 md:px-6 flex items-center gap-2 sticky top-0 md:relative z-30 shadow-sm md:shadow-none transition-all ${isMobileLandscape ? 'py-0.5' : 'py-2 md:py-3'}`}>
                                {/* Title & Group */}
                                <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1">
                                    <input
                                        value={sessionTitle}
                                        onChange={e => setSessionTitle(e.target.value)}
                                        className={`bg-transparent font-black outline-none placeholder:text-slate-300 min-w-0 text-slate-900 border-none focus:ring-0 p-1 transition-all ${isMobileLandscape ? 'text-xs' : 'text-base md:text-xl'}`}
                                        placeholder="Nombre de la Sesión"
                                    />
                                    <div className="flex items-center gap-1 md:ml-2">
                                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest hidden md:block">Grupo:</span>
                                        <input
                                            value={sessionGroup}
                                            onChange={e => setSessionGroup(e.target.value)}
                                            list="existing-groups"
                                            className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-600 outline-none focus:border-blue-400 placeholder:text-slate-300"
                                            placeholder="Carpeta / Grupo..."
                                        />
                                        <datalist id="existing-groups">
                                            {sessionGroups.map(g => (
                                                <option key={g.id} value={g.name} />
                                            ))}
                                        </datalist>
                                    </div>
                                </div>

                                {/* Compact Action Bar */}
                                <div className="flex gap-1.5 shrink-0 items-center">
                                    {/* Type Selector - Hide labels in landscape */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setPdpDropdownOpen(!pdpDropdownOpen)}
                                            className={`px-2.5 rounded-lg border flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all
                                    ${isMobileLandscape ? 'h-6' : 'h-8'}
                                    ${sessionType === 'PDP-T' ? 'bg-purple-100 text-purple-600 border-purple-200' :
                                                    sessionType === 'PDP-R' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                                        sessionType === 'PDP-E' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                                            sessionType === 'CARDIO' ? 'bg-orange-100 text-orange-600 border-orange-200' :
                                                                'bg-slate-50 text-slate-500 border-slate-200'}
                                `}
                                        >
                                            {isMobileLandscape ? sessionType.replace('PDP-', '') : (sessionType === 'LIBRE' ? 'LIBRE' : sessionType)}
                                            <ChevronDown size={12} className={pdpDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                                        </button>
                                        {pdpDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setPdpDropdownOpen(false)} />
                                                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 min-w-[120px]">
                                                    {['LIBRE', 'PDP-T', 'PDP-R', 'PDP-E', 'CARDIO'].map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => {
                                                                if (t === 'LIBRE') {
                                                                    setSessionType(t);
                                                                    setIsCardio(false);
                                                                } else if (t === 'CARDIO') {
                                                                    applyCardioTemplate();
                                                                } else {
                                                                    applyTemplate(t);
                                                                    setIsCardio(false);
                                                                }
                                                                setPdpDropdownOpen(false);
                                                            }}
                                                            className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-slate-50 ${sessionType === t ? 'text-emerald-600 bg-emerald-50' : 'text-slate-700'}`}
                                                        >
                                                            {t === 'LIBRE' ? 'MODO LIBRE' : t === 'CARDIO' ? 'CARDIO' : t}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setMainView('sessions')}
                                        className={`bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-200 ${isMobileLandscape ? 'w-6 h-6' : 'w-8 h-8'}`}
                                        title="Cargar Sesión"
                                    >
                                        <Download size={isMobileLandscape ? 12 : 16} />
                                    </button>
                                    {!isMobilePortrait && (
                                        <button
                                            onClick={() => setRightSidebarView(prev => prev === 'library' ? 'overview' : 'library')}
                                            className={`px-3 rounded-lg border flex items-center gap-2 text-xs font-bold transition-all
                                    ${isMobileLandscape ? 'h-6 text-[10px]' : 'h-8'}
                                    ${rightSidebarView === 'library'
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'
                                                }`}
                                        >
                                            <Library size={14} />
                                            {!isMobileLandscape && 'Biblioteca'}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearSession}
                                        className={`bg-slate-50 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-500 flex items-center justify-center transition-colors border border-slate-200 ${isMobileLandscape ? 'w-6 h-6' : 'w-8 h-8'}`}
                                        title="Borrar Sesión"
                                    >
                                        <Trash2 size={isMobileLandscape ? 12 : 16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Main Content Area - Conditional based on mainView */}

                        {/* Main Content Area - Conditional based on mainView */}
                        {
                            mainView === 'editor' && (
                                <>
                                    <div className={`flex-1 flex bg-slate-50/50 transition-all ${(isMobileLandscape && rightSidebarView === 'library') ? 'flex-row' : 'flex-col md:flex-row'} ${isLibraryDragging ? 'overflow-visible' : 'overflow-hidden'}`}>

                                        {/* LEFT: BLOCKS EDITOR (Scrollable) */}
                                        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-slate-200">

                                            {/* Mobile Description (Collapsible) */}
                                            <div className={`md:hidden rounded-2xl mb-6 overflow-hidden transition-all ${descriptionExpanded ? 'bg-indigo-50/50 border border-indigo-100 ring-4 ring-indigo-50/30' : 'bg-white border border-slate-100'}`}>
                                                <button
                                                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                                    className="w-full px-4 py-3 flex items-center justify-between group active:scale-[0.98] transition-all"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${descriptionExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                                                            <ClipboardList size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <span className={`block text-xs font-black uppercase tracking-wider ${descriptionExpanded ? 'text-indigo-900' : 'text-slate-600'}`}>
                                                                Notas de la Sesión
                                                            </span>
                                                            {!descriptionExpanded && (
                                                                <span className="text-[10px] text-slate-400 block font-medium truncate max-w-[180px]">
                                                                    {sessionDescription || 'Sin notas...'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${descriptionExpanded ? 'bg-indigo-200 text-indigo-700 rotate-180' : 'text-slate-300'}`}>
                                                        <ChevronDown size={14} />
                                                    </div>
                                                </button>
                                                {descriptionExpanded && (
                                                    <div className="px-4 pb-4">
                                                        <textarea
                                                            value={sessionDescription}
                                                            onChange={(e) => setSessionDescription(e.target.value)}
                                                            className="w-full bg-white border border-indigo-100 rounded-xl p-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200 resize-none font-medium leading-relaxed placeholder:text-indigo-200/50"
                                                            placeholder="Escribe aquí los objetivos, enfoque o notas para el atleta..."
                                                            rows={4}
                                                            autoFocus
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <Reorder.Group
                                                as="div"
                                                axis="y"
                                                values={blocks}
                                                onReorder={setBlocks}
                                                className="max-w-4xl mx-auto space-y-6 pb-24 md:pb-0"
                                            >
                                                <AnimatePresence mode="popLayout">
                                                    {blocks.map((block, idx) => (
                                                        <DraggableBlock
                                                            key={block.id}
                                                            block={block}
                                                            idx={idx}
                                                            isMobileLandscape={isMobileLandscape}
                                                            isSessionCardio={isCardio}
                                                            onUpdate={(d) => updateBlock(idx, d)}
                                                            onRemove={() => setBlocks(blocks.filter((_, i) => i !== idx))}
                                                            onDuplicate={() => {
                                                                const newBlocks = [...blocks];
                                                                const copy = {
                                                                    ...block,
                                                                    id: crypto.randomUUID(),
                                                                    name: `${block.name} (Copia)`,
                                                                    exercises: block.exercises.map(e => ({ ...e, id: crypto.randomUUID() }))
                                                                };
                                                                newBlocks.splice(idx + 1, 0, copy);
                                                                setBlocks(newBlocks);
                                                            }}
                                                            onSaveModule={() => saveModuleToDB(block)}
                                                            onImportModule={() => {
                                                                setActiveBlockIdxForPicker(idx);
                                                                setModulePickerOpen(true);
                                                            }}
                                                            onAddExercise={() => handleAddExerciseRequest(idx)}
                                                            onOpenConfig={handleOpenConfig}
                                                            onSwapExercise={handleSwapExercise}
                                                            onProtocolChange={(p) => handleBlockProtocolUpdate(idx, p)}
                                                        />
                                                    ))}
                                                </AnimatePresence>

                                                <button
                                                    onClick={addBlock}
                                                    className="w-full py-6 rounded-2xl border-3 border-dashed border-slate-200 text-slate-400 font-black uppercase tracking-wider hover:bg-white hover:border-emerald-400 hover:text-emerald-600 hover:shadow-lg transition-all flex items-center justify-center gap-3 group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                                                        <Plus size={20} />
                                                    </div>
                                                    Añadir Bloque
                                                </button>

                                                <div className="h-10 md:hidden" />
                                            </Reorder.Group>
                                        </div>

                                        {/* RIGHT: DESKTOP SIDEBAR (Overview & Actions) */}
                                        {/* RIGHT: DESKTOP SIDEBAR (Overview & Library) - Conditional visibility in Mobile Landscape */}
                                        {(!isMobileLandscape || rightSidebarView === 'library') && (
                                            <div className={`flex flex-col bg-white border-l border-slate-200 shadow-xl transition-all
                                    ${isMobileLandscape
                                                    ? 'w-72 shrink-0 border-l-4 border-blue-500 relative z-20'
                                                    : 'hidden md:flex w-80 lg:w-96 z-20'
                                                }
                                    ${isLibraryDragging ? 'overflow-visible' : 'overflow-hidden'}
                                `}>
                                                {rightSidebarView === 'overview' ? (
                                                    /* OVERVIEW MODE */
                                                    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto">
                                                        <div>
                                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">Resumen Sesión</h3>
                                                            <textarea
                                                                value={sessionDescription}
                                                                onChange={(e) => setSessionDescription(e.target.value)}
                                                                className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-200 resize-none leading-relaxed transition-all focus:bg-white"
                                                                placeholder="Describe el objetivo de la sesión, instrucciones generales para el atleta, calentamiento..."
                                                            />
                                                        </div>

                                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                                <span>Bloques</span>
                                                                <span>{blocks.length}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs font-bold text-slate-600">
                                                                <span>Ejercicios</span>
                                                                <span>{blocks.reduce((acc, b) => acc + b.exercises.length, 0)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto pt-6 border-t border-slate-100">
                                                            <button
                                                                onClick={handleSaveSession}
                                                                disabled={isSaving}
                                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100 group"
                                                            >
                                                                {isSaving ? <Loader2 className="animate-spin" /> : <Check className="group-hover:scale-110 transition-transform" />}
                                                                {isSaving ? 'Guardando...' : 'Guardar y Salir'}
                                                            </button>
                                                            <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
                                                                Cambios guardados en local automáticamente
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* LIBRARY MODE (Draggable) */
                                                    <div className="flex-1 flex flex-col bg-slate-50">
                                                        {/* Header / Search */}
                                                        <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Biblioteca de Ejercicios</h3>
                                                                    <span className="text-[10px] text-blue-600 font-bold">Arrastra al editor</span>
                                                                </div>
                                                                {isMobileLandscape && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setRightSidebarView('overview'); }}
                                                                        className="p-2 -mr-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                                    >
                                                                        <X size={18} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
                                                                    <Search className="text-slate-400" size={16} />
                                                                    <input
                                                                        autoFocus
                                                                        placeholder="Buscar..."
                                                                        className="flex-1 bg-transparent outline-none font-bold text-slate-800 text-xs"
                                                                        value={pickerSearch}
                                                                        onChange={e => setPickerSearch(e.target.value)}
                                                                    />
                                                                    {pickerSearch && <button onClick={() => setPickerSearch('')} className="p-1 hover:bg-white rounded-full"><X size={14} /></button>}
                                                                </div>
                                                                <button
                                                                    onClick={() => setSidebarFilterOpen(!sidebarFilterOpen)}
                                                                    className={`p-2 rounded-xl flex items-center justify-center transition-colors ${sidebarFilterOpen ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'}`}
                                                                >
                                                                    <Filter size={16} />
                                                                </button>
                                                            </div>

                                                            {/* Collapsible Sidebar Filter Drawer */}
                                                            <AnimatePresence>
                                                                {sidebarFilterOpen && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="overflow-hidden bg-slate-50 rounded-xl border border-slate-200"
                                                                    >
                                                                        <div className="p-3 space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                                                            <div>
                                                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Patrón</p>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {PATTERNS.map(p => (
                                                                                        <button
                                                                                            key={p}
                                                                                            onClick={() => toggleFilter('pattern', p)}
                                                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${pickerFilter.pattern.includes(p) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                                                        >
                                                                                            {p}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            <div>
                                                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Equipamiento</p>
                                                                                <div className="flex flex-wrap gap-1.5">
                                                                                    {EQUIPMENT.map(eq => (
                                                                                        <button
                                                                                            key={eq}
                                                                                            onClick={() => toggleFilter('equipment', eq)}
                                                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${pickerFilter.equipment.includes(eq) ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-200 hover:text-emerald-600'}`}
                                                                                        >
                                                                                            {eq}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            <div className="grid grid-cols-2 gap-4">
                                                                                <div>
                                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Nivel</p>
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        {LEVELS.map(l => (
                                                                                            <button
                                                                                                key={l}
                                                                                                onClick={() => toggleFilter('level', l)}
                                                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors text-left ${pickerFilter.level.includes(l) ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                                                                            >
                                                                                                {l}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Cualidad</p>
                                                                                    <div className="flex flex-col gap-1.5">
                                                                                        {QUALITIES.map(q => (
                                                                                            <button
                                                                                                key={q.id}
                                                                                                onClick={() => toggleFilter('quality', q.id)}
                                                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors text-left ${pickerFilter.quality.includes(q.id) ? 'bg-indigo-500 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                                                                                            >
                                                                                                {q.label}
                                                                                            </button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>

                                                        {/* Draggable List */}
                                                        <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent hover:scrollbar-thumb-slate-500 flex flex-col min-h-0">
                                                            {filterExerciseList(allExercises, pickerSearch, pickerFilter).map(ex => (
                                                                <motion.div
                                                                    key={ex.id}
                                                                    drag
                                                                    dragSnapToOrigin
                                                                    dragMomentum={false}
                                                                    whileDrag={{ scale: 1.05, zIndex: 1000, cursor: 'grabbing', opacity: 1, rotate: 2 }}
                                                                    whileHover={{ scale: 1.02 }}
                                                                    onDragStart={() => setIsLibraryDragging(true)}
                                                                    onDragEnd={(e, info) => handleLibraryDragEnd(e, info, ex)}
                                                                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing flex items-center gap-3 select-none group relative overflow-hidden"
                                                                >

                                                                    {/* Image */}
                                                                    <div className="w-10 h-10 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                                                                        {(ex.mediaUrl || ex.gifUrl || ex.imageStart || ExerciseAPI.getYoutubeThumbnail(ex.youtubeUrl)) ? (
                                                                            <img src={ex.mediaUrl || ex.gifUrl || ex.imageStart || ExerciseAPI.getYoutubeThumbnail(ex.youtubeUrl)} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-slate-300"><Dumbbell size={16} /></div>
                                                                        )}
                                                                    </div>

                                                                    {/* Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-bold text-slate-800 text-xs truncate leading-tight group-hover:text-blue-600 transition-colors">
                                                                            {ex.nameEs || ex.name_es || ex.name}
                                                                        </h4>
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                                                {ex.pattern || 'Global'}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Drag Handle Indicator */}
                                                                    <div className="opacity-0 group-hover:opacity-100 text-slate-300 transition-opacity">
                                                                        <Move size={14} />
                                                                    </div>
                                                                </motion.div>
                                                            ))}

                                                            {/* Empty State */}
                                                            {filterExerciseList(allExercises, pickerSearch, pickerFilter).length === 0 && (
                                                                <div className="text-center py-10 opacity-50">
                                                                    <p className="text-xs font-bold">No se encontraron ejercicios</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MOBILE FLOATING ACTION (Save) - Hide in landscape mobile */}
                                        {!isMobileLandscape && (
                                            <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                                                <button
                                                    onClick={handleSaveSession}
                                                    disabled={isSaving}
                                                    className="bg-slate-900 text-white px-6 py-3 rounded-full font-bold shadow-xl shadow-slate-900/40 active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                                    {isSaving ? '...' : 'Guardar'}
                                                </button>
                                            </div>
                                        )}
                                    </div>


                                </>
                            )
                        }

                        {/* Library View */}
                        {/* Library View */}
                        {
                            mainView === 'library' && (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {/* Search & Filter */}
                                    <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50">
                                        {/* Unified Tab Selector - Matching Picker Modal */}
                                        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm relative mb-2">
                                            <button
                                                onClick={() => setPickerTab('library')}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${pickerTab === 'library' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Biblioteca
                                                <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full ${pickerTab === 'library' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                    {allExercises.length}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setPickerTab('online')}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${pickerTab === 'online' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <UploadCloud size={14} /> Online
                                                {bulkExercises.length > 0 && (
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-full ${pickerTab === 'online' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                                        {bulkExercises.length}
                                                    </span>
                                                )}
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                value={pickerSearch}
                                                onChange={(e) => setPickerSearch(e.target.value)}
                                                placeholder={pickerTab === 'online' ? "Buscar en ExerciseDB (en inglés)..." : "Buscar ejercicio..."}
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-emerald-500 text-sm font-medium"
                                            />
                                            {isSearchingOnline && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin" size={18} />}
                                        </div>
                                        <div className="flex flex-col md:flex-row md:items-center justify-between mt-2 gap-2">
                                            <p className="text-[10px] text-slate-400 font-bold order-2 md:order-1">
                                                {pickerTab === 'library' ? `${filteredLibraryExercises.length} ejercicios` : `${onlineResults.length} resultados`}
                                                {pickerTab === 'library' && (pickerFilter.pattern.length + pickerFilter.equipment.length + pickerFilter.level.length + pickerFilter.quality.length) > 0 &&
                                                    ` • Filtros activos`
                                                }
                                            </p>
                                            {pickerTab === 'library' && (
                                                <div className="flex items-center gap-2 order-1 md:order-2 ml-auto md:ml-0 w-full md:w-auto justify-end">
                                                    <button
                                                        onClick={() => handleStartCreation()}
                                                        className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                                                    >
                                                        <Plus size={14} />
                                                        <span className="hidden md:inline">Nuevo Ejercicio</span>
                                                        <span className="md:hidden">Nuevo</span>
                                                    </button>
                                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="text"
                                                            placeholder="Grupo..."
                                                            className="w-24 md:w-32 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-400"
                                                            value={newGroupName}
                                                            onChange={e => setNewGroupName(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleCreateGroup('EXERCISE')}
                                                        />
                                                        <button
                                                            onClick={() => handleCreateGroup('EXERCISE')}
                                                            disabled={isCreatingGroup || !newGroupName.trim()}
                                                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                            title="Crear Grupo de Ejercicios"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                                                    <button
                                                        onClick={() => setLibraryFilterDrawerOpen(!libraryFilterDrawerOpen)}
                                                        className={`p-1.5 md:p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors ${(pickerFilter.pattern.length + pickerFilter.equipment.length + pickerFilter.level.length + pickerFilter.quality.length) > 0
                                                            ? 'bg-slate-900 text-white'
                                                            : 'bg-white text-slate-500 border border-slate-200'
                                                            }`}
                                                    >
                                                        <Filter size={14} /> <span className="hidden md:inline">Filtros</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Library Filter Drawer (Uses Unified Toggle) */}
                                        <AnimatePresence>
                                            {libraryFilterDrawerOpen && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden bg-white rounded-xl border border-slate-200 mt-2"
                                                >
                                                    <div className="p-3 space-y-4">
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Patrón</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {PATTERNS.map(p => (
                                                                    <button key={p} onClick={() => toggleFilter('pattern', p)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.pattern.includes(p) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{p}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Equipamiento</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {EQUIPMENT.map(e => (
                                                                    <button key={e} onClick={() => toggleFilter('equipment', e)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.equipment.includes(e) ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{e}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Nivel</p>
                                                                <div className="flex flex-col gap-2">
                                                                    {LEVELS.map(l => (
                                                                        <button key={l} onClick={() => toggleFilter('level', l)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors text-left ${pickerFilter.level.includes(l) ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{l}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Cualidad</p>
                                                                <div className="flex flex-col gap-2">
                                                                    {QUALITIES.map(q => (
                                                                        <button key={q.id} onClick={() => toggleFilter('quality', q.id)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors text-left ${pickerFilter.quality.includes(q.id) ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>{q.label}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => setPickerFilter({ pattern: [], equipment: [], level: [], quality: [] })}
                                                            className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg"
                                                        >
                                                            Limpiar Filtros
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Exercise Grid */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <div className="grid grid-cols-1 gap-3">
                                            {pickerTab === 'library' ? (
                                                (() => {
                                                    // Grouping Logic
                                                    const grouped = filteredLibraryExercises.reduce((acc, ex) => {
                                                        const group = ex.group || 'Sin agrupar';
                                                        if (!acc[group]) acc[group] = [];
                                                        acc[group].push(ex);
                                                        return acc;
                                                    }, {});

                                                    // Add explicitly created groups
                                                    exerciseGroups.forEach(g => {
                                                        if (!grouped[g.name]) grouped[g.name] = [];
                                                    });

                                                    const sortedGroups = Object.keys(grouped).sort((a, b) => {
                                                        if (a === 'Sin agrupar') return 1;
                                                        if (b === 'Sin agrupar') return -1;
                                                        return a.localeCompare(b);
                                                    });

                                                    if (sortedGroups.length === 0 || (sortedGroups.length === 1 && sortedGroups[0] === 'Sin agrupar' && grouped['Sin agrupar'].length === 0)) {
                                                        return (
                                                            <div className="text-center py-20 opacity-40">
                                                                <Search size={48} className="mx-auto mb-4" />
                                                                <p className="font-bold text-sm">No hay resultados en la biblioteca local</p>
                                                            </div>
                                                        );
                                                    }

                                                    return sortedGroups.map(groupName => {
                                                        const exercises = grouped[groupName];
                                                        const groupDoc = exerciseGroups.find(g => g.name === groupName);
                                                        const isExpanded = expandedGroups[`ex_${groupName}`] !== false; // Default expanded

                                                        // Skip empty "Sin agrupar" if we have other groups, or show it? 
                                                        // Usually we want to show it if there are exercises.
                                                        if (groupName === 'Sin agrupar' && exercises.length === 0) return null;

                                                        return (
                                                            <div key={groupName} className="space-y-2 mb-2">
                                                                <div className="flex items-center gap-2 group/header-container">
                                                                    <button
                                                                        onClick={() => setExpandedGroups(prev => ({ ...prev, [`ex_${groupName}`]: !isExpanded }))}
                                                                        className="flex-1 flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors group/header"
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <div className={`w-1.5 h-1.5 rounded-full ${groupName === 'Sin agrupar' ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/header:text-slate-900 transition-colors">
                                                                                {groupName} <span className="ml-1 text-slate-300">({exercises.length})</span>
                                                                            </span>
                                                                        </div>
                                                                        <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                    {groupName !== 'Sin agrupar' && (
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleStartCreation(groupName); }}
                                                                            className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all opacity-0 group-hover/header-container:opacity-100"
                                                                            title={`Añadir ejercicio a ${groupName}`}
                                                                        >
                                                                            <Plus size={14} />
                                                                        </button>
                                                                    )}
                                                                    {groupDoc && exercises.length === 0 && (
                                                                        <button
                                                                            onClick={() => handleDeleteGroup(groupDoc.id, groupName, 'EXERCISE')}
                                                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/header-container:opacity-100"
                                                                            title="Eliminar Grupo Vacío"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="space-y-3">
                                                                        {exercises.length === 0 && groupName !== 'Sin agrupar' && (
                                                                            <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed text-center">
                                                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Carpeta vacía</p>
                                                                            </div>
                                                                        )}
                                                                        {exercises.map(ex => (
                                                                            <ExerciseCard
                                                                                key={ex.id}
                                                                                ex={ex}
                                                                                showCheckbox={false}
                                                                                onEdit={() => handleLibraryEdit(ex)}
                                                                                onDelete={() => handleLibraryDelete(ex.id)}
                                                                                onDuplicate={() => handleLibraryDuplicate(ex)}
                                                                                onMove={() => setMovingExercise(ex)}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                <>
                                                    {pickerTab === 'online' && (
                                                        <div className="mb-4">
                                                            {!discoveryMode && (
                                                                <button
                                                                    onClick={handleEnableDiscovery}
                                                                    className="w-full p-4 bg-emerald-50 border border-dashed border-emerald-300 rounded-2xl flex items-center gap-4 text-emerald-700 hover:bg-emerald-100 transition-all group"
                                                                >
                                                                    <Zap size={24} className="group-hover:scale-110 transition-transform" />
                                                                    <div className="text-left">
                                                                        <p className="font-black text-sm uppercase tracking-tight">Activar Modo Discovery</p>
                                                                        <p className="text-[10px] font-bold opacity-70">Carga rápida de más de 1300 ejercicios sin límites.</p>
                                                                    </div>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isSearchingOnline ? (
                                                        <div className="text-center py-20">
                                                            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={32} />
                                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Buscando en la nube...</p>
                                                        </div>
                                                    ) : onlineResults.length > 0 ? (
                                                        onlineResults.map(onlineEx => (
                                                            <ExerciseCard
                                                                key={onlineEx.id}
                                                                ex={{
                                                                    ...onlineEx,
                                                                    source: 'exercisedb'
                                                                }}
                                                                showCheckbox={false}
                                                                showActions={false}
                                                                onImport={() => handleImportOnlineExercise(onlineEx)}
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-20 opacity-40">
                                                            <UploadCloud size={48} className="mx-auto mb-4" />
                                                            <p className="font-bold text-sm">
                                                                {pickerSearch.length < 3 ? 'Escribe al menos 3 letras para buscar' : 'No se encontraron resultados online'}
                                                            </p>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        }


                        {/* Sessions View */}
                        {
                            mainView === 'sessions' && (
                                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                    {/* Actions Header */}
                                    <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex-1 relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o descripción..."
                                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400 transition-all"
                                                value={pickerSearch}
                                                onChange={e => setPickerSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Nuevo grupo..."
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400 transition-all w-32 md:w-48"
                                                value={newGroupName}
                                                onChange={e => setNewGroupName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                                            />
                                            <button
                                                onClick={handleCreateGroup}
                                                disabled={isCreatingGroup || !newGroupName.trim()}
                                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                title="Crear Grupo"
                                            >
                                                {isCreatingGroup ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {(() => {
                                            const filtered = allSessions.filter(s =>
                                                s.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                                                (s.description || '').toLowerCase().includes(pickerSearch.toLowerCase())
                                            );

                                            // Create a map of groups and their sessions
                                            const grouped = filtered.reduce((acc, s) => {
                                                const group = s.group || 'Sin agrupar';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(s);
                                                return acc;
                                            }, {});

                                            // Add empty explicit groups (only Session groups)
                                            sessionGroups.forEach(g => {
                                                if (!grouped[g.name]) {
                                                    grouped[g.name] = [];
                                                }
                                            });

                                            // Sort groups (General first, others alphabetical)
                                            const sortedGroups = Object.keys(grouped).sort((a, b) => {
                                                if (a === 'Sin agrupar') return 1;
                                                if (b === 'Sin agrupar') return -1;
                                                return a.localeCompare(b);
                                            });

                                            if (sortedGroups.length === 0) {
                                                return (
                                                    <div className="py-20 text-center text-slate-400">
                                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                            <Search size={32} className="opacity-20" />
                                                        </div>
                                                        <p className="text-xs font-black uppercase tracking-widest italic">No se encontraron sesiones</p>
                                                    </div>
                                                );
                                            }

                                            return sortedGroups.map(groupName => {
                                                const sessions = grouped[groupName];
                                                const groupDoc = sessionGroups.find(g => g.name === groupName);
                                                const isExpanded = expandedGroups[groupName] !== false; // Default to expanded

                                                return (
                                                    <div key={groupName} className="space-y-2">
                                                        <div className="flex items-center gap-2 group/header-container">
                                                            <button
                                                                onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isExpanded }))}
                                                                className="flex-1 flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl transition-colors group/header"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-1.5 h-1.5 rounded-full ${groupName === 'Sin agrupar' ? 'bg-slate-300' : 'bg-blue-500'}`} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/header:text-slate-900 transition-colors">
                                                                        {groupName} <span className="ml-1 text-slate-300">({sessions.length})</span>
                                                                    </span>
                                                                </div>
                                                                <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </button>
                                                            {groupDoc && sessions.length === 0 && (
                                                                <button
                                                                    onClick={() => handleDeleteGroup(groupDoc.id, groupName)}
                                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/header-container:opacity-100"
                                                                    title="Eliminar Grupo Vacío"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                {sessions.length === 0 ? (
                                                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed text-center">
                                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Grupo vacío</p>
                                                                    </div>
                                                                ) : (
                                                                    sessions.map(session => (
                                                                        <div key={session.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                                                                            <div className="flex justify-between items-start mb-2">
                                                                                <div>
                                                                                    <div className="flex items-center gap-2 mb-1">
                                                                                        <h3 className="font-bold text-slate-800">{session.name}</h3>
                                                                                        {session.type && (
                                                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${session.type === 'PDP-T' ? 'bg-purple-100 text-purple-600' :
                                                                                                session.type === 'PDP-R' ? 'bg-blue-100 text-blue-600' :
                                                                                                    session.type === 'PDP-E' ? 'bg-emerald-100 text-emerald-600' :
                                                                                                        'bg-slate-100 text-slate-500'
                                                                                                }`}>
                                                                                                {session.type}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    <p className="text-[10px] text-slate-400">{(session.blocks || []).length} bloques</p>
                                                                                </div>
                                                                                <div className="flex gap-1 shrink-0">
                                                                                    <ActionMenu
                                                                                        actions={[
                                                                                            { label: 'Ver Detalles', icon: <Eye size={16} />, onClick: () => setPreviewingSession(session) },
                                                                                            { label: 'Cargar en Editor', icon: <Download size={16} />, onClick: () => handleLoadSession(session) },
                                                                                            { label: 'Mover a Grupo', icon: <Move size={16} />, onClick: () => setMovingSession(session) },
                                                                                            { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDeleteSession(session.id), variant: 'danger' }
                                                                                        ]}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            {session.description && (
                                                                                <p className="text-xs text-slate-500 line-clamp-2">{session.description}</p>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )
                        }

                        {/* Library Edit Drawer */}
                        <ExerciseFormDrawer
                            isOpen={libraryEditDrawerOpen}
                            title="Editar Ejercicio"
                            exercise={libraryEditExercise}
                            groups={exerciseGroups}
                            onSave={handleLibrarySave}
                            onClose={() => { setLibraryEditDrawerOpen(false); setLibraryEditExercise(null); }}
                            onDirtyChange={setExDrawerDirty}
                        />

                        {/* Move Session Modal */}
                        <AnimatePresence>
                            {movingSession && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                                        onClick={() => setMovingSession(null)}
                                    />
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl z-[110] overflow-hidden flex flex-col max-h-[70vh]"
                                    >
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mover Sesión</p>
                                                <h3 className="text-xl font-black text-slate-900 truncate">{movingSession.name}</h3>
                                            </div>
                                            <button onClick={() => setMovingSession(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                                <X size={20} className="text-slate-600" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                            {allGroups.length === 0 && (
                                                <p className="text-center py-8 text-xs text-slate-400 italic font-medium">No hay grupos creados</p>
                                            )}
                                            <button
                                                onClick={() => handleQuickMove(movingSession.id, '')}
                                                className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 text-sm font-bold text-slate-600 flex items-center justify-between border border-transparent hover:border-slate-200 transition-all group"
                                            >
                                                <span>Sin agrupar</span>
                                                <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                            {sessionGroups.map(group => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleQuickMove(movingSession.id, group.name)}
                                                    className="w-full text-left p-4 rounded-2xl hover:bg-blue-50 text-sm font-bold text-slate-700 flex items-center justify-between border border-transparent hover:border-blue-100 transition-all group"
                                                >
                                                    <span>{group.name}</span>
                                                    <ChevronRight size={16} className="text-blue-300 opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>

                                        {isMoving && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-blue-600" size={32} />
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>

                        {/* Move Exercise Modal */}
                        <AnimatePresence>
                            {movingExercise && (
                                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                                        onClick={() => setMovingExercise(null)}
                                    />
                                    <motion.div
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl z-[110] overflow-hidden flex flex-col max-h-[70vh]"
                                    >
                                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mover Ejercicio</p>
                                                <h3 className="text-xl font-black text-slate-900 truncate max-w-[200px]">{movingExercise.name}</h3>
                                            </div>
                                            <button onClick={() => setMovingExercise(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                                <X size={20} className="text-slate-600" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4 space-y-1">
                                            {exerciseGroups.length === 0 && (
                                                <p className="text-center py-8 text-xs text-slate-400 italic font-medium">No hay grupos de ejercicios creados</p>
                                            )}
                                            <button
                                                onClick={() => handleQuickMoveExercise(movingExercise.id, '')}
                                                className="w-full text-left p-4 rounded-2xl hover:bg-slate-50 text-sm font-bold text-slate-600 flex items-center justify-between border border-transparent hover:border-slate-200 transition-all group"
                                            >
                                                <span>Sin agrupar</span>
                                                <ChevronRight size={16} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                                            </button>
                                            {exerciseGroups.map(group => (
                                                <button
                                                    key={group.id}
                                                    onClick={() => handleQuickMoveExercise(movingExercise.id, group.name)}
                                                    className="w-full text-left p-4 rounded-2xl hover:bg-emerald-50 text-sm font-bold text-slate-700 flex items-center justify-between border border-transparent hover:border-emerald-100 transition-all group"
                                                >
                                                    <span>{group.name}</span>
                                                    <ChevronRight size={16} className="text-emerald-300 opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>

                                        {isMoving && (
                                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-emerald-600" size={32} />
                                            </div>
                                        )}
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                        {/* Exercise Picker Modal */}
                        <AnimatePresence>
                            {exercisePickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                                    className="absolute inset-0 bg-white z-50 flex flex-col"
                                >
                                    <div className="p-4 border-b space-y-3">
                                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl">
                                            <Search className="text-slate-400" size={20} />
                                            <input
                                                autoFocus
                                                placeholder="Buscar ejercicio..."
                                                className="flex-1 bg-transparent outline-none font-bold text-slate-800"
                                                value={pickerSearch}
                                                onChange={e => setPickerSearch(e.target.value)}
                                            />
                                            <button onClick={() => setExercisePickerOpen(false)} className="p-2 bg-white rounded-full shadow-sm"><X size={16} /></button>
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex bg-slate-100 p-1 rounded-xl">
                                            <button
                                                onClick={() => setPickerTab('library')}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${pickerTab === 'library' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                Biblioteca
                                            </button>
                                            <button
                                                onClick={() => setPickerTab('online')}
                                                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${pickerTab === 'online' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                <UploadCloud size={14} /> Online
                                            </button>
                                        </div>

                                        {/* Filter Chips - Show in Library AND Online */}
                                        {(pickerTab === 'library' || pickerTab === 'online') && (
                                            <>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-slate-400 font-bold">
                                                        {(pickerFilter.pattern.length + pickerFilter.equipment.length + pickerFilter.level.length + pickerFilter.quality.length + pickerFilter.group.length) > 0
                                                            ? `${pickerFilter.pattern.length + pickerFilter.equipment.length + pickerFilter.level.length + pickerFilter.quality.length + pickerFilter.group.length} filtros activos`
                                                            : 'Filtrar por características'}
                                                    </p>
                                                    <button
                                                        onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                                                        className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors ${(pickerFilter.pattern.length + pickerFilter.equipment.length + pickerFilter.level.length + pickerFilter.quality.length + pickerFilter.group.length) > 0
                                                            ? 'bg-slate-900 text-white'
                                                            : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                    >
                                                        <Filter size={14} /> Filtros
                                                    </button>
                                                </div>

                                                {/* Collapsible Filter Drawer */}
                                                <AnimatePresence>
                                                    {filterDrawerOpen && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden bg-slate-50 rounded-xl border border-slate-200 mt-2"
                                                        >
                                                            <div className="p-3 space-y-4">
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Patrón de Movimiento</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {PATTERNS.map(p => (
                                                                            <button
                                                                                key={p}
                                                                                onClick={() => toggleFilter('pattern', p)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.pattern.includes(p)
                                                                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {p}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Equipamiento</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {EQUIPMENT.map(e => (
                                                                            <button
                                                                                key={e}
                                                                                onClick={() => toggleFilter('equipment', e)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.equipment.includes(e)
                                                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {e}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Dificultad (Nivel)</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {LEVELS.map(l => (
                                                                            <button
                                                                                key={l}
                                                                                onClick={() => toggleFilter('level', l)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.level.includes(l)
                                                                                    ? 'bg-purple-100 text-purple-700 border-purple-200'
                                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {l}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Cualidad</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {QUALITIES.map(q => (
                                                                            <button
                                                                                key={q.id}
                                                                                onClick={() => toggleFilter('quality', q.id)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.quality.includes(q.id)
                                                                                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {q.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Grupo / Carpeta</p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {[{ id: 'none', name: 'Sin agrupar' }, ...exerciseGroups].map(g => (
                                                                            <button
                                                                                key={g.id}
                                                                                onClick={() => toggleFilter('group', g.name)}
                                                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${pickerFilter.group.includes(g.name)
                                                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                                                                    }`}
                                                                            >
                                                                                {g.name}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => setPickerFilter({ pattern: [], equipment: [], level: [], quality: [], group: [] })}
                                                                    className="w-full py-2 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg"
                                                                >
                                                                    Limpiar Filtros
                                                                </button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {pickerTab === 'library' ? (
                                            <>
                                                {/* Bypass / Create Custom Option */}
                                                {pickerSearch.length > 0 && (
                                                    <button
                                                        onClick={() => handleStartCreation()}
                                                        className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center gap-3 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all mb-2"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                                            <Plus size={20} />
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-sm">Crear "{pickerSearch}"</p>
                                                            <p className="text-[10px] font-bold opacity-70">Guardar en base de datos y añadir</p>
                                                        </div>
                                                    </button>
                                                )}

                                                {/* Filtered List */}
                                                {(() => {
                                                    const filteredList = filterExerciseList(allExercises, pickerSearch, pickerFilter);

                                                    return (
                                                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                                            {filteredList.map(ex => (
                                                                <div key={ex.id} onClick={() => handleExerciseSelect(ex)} className="flex items-center gap-4 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer">
                                                                    <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                                                        {(ex.mediaUrl || ex.gifUrl || ex.imageStart || ExerciseAPI.getYoutubeThumbnail(ex.youtubeUrl)) && (
                                                                            <img src={ex.mediaUrl || ex.gifUrl || ex.imageStart || ExerciseAPI.getYoutubeThumbnail(ex.youtubeUrl)} className="w-full h-full object-cover" />
                                                                        )}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-bold text-slate-800 text-sm truncate">{ex.nameEs || ex.name_es || ex.name}</h4>
                                                                        {(ex.nameEs || ex.name_es) && (ex.nameEs || ex.name_es) !== ex.name && (
                                                                            <p className="text-[10px] text-slate-400 truncate">{ex.name}</p>
                                                                        )}
                                                                        {(ex.descriptionEs || ex.description || (ex.instructionsEs && ex.instructionsEs.length > 0) || (ex.instructions_es && ex.instructions_es.length > 0) || (ex.instructions && ex.instructions.length > 0)) && (
                                                                            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                                                                                {ex.descriptionEs || ex.description || (ex.instructionsEs?.[0]) || (ex.instructions_es?.[0]) || (ex.instructions?.[0]) || ''}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <>
                                                {discoveryMode ? (
                                                    <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 mb-2 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                                                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-tighter">Modo Discovery Activo ({bulkExercises.length} items)</p>
                                                            </div>
                                                            <button
                                                                onClick={() => setDiscoveryMode(false)}
                                                                className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase"
                                                            >
                                                                Desactivar
                                                            </button>
                                                        </div>

                                                        {/* Export/Import Actions */}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={handleExportCatalog}
                                                                className="flex-1 py-2 px-3 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 hover:bg-emerald-200 transition-colors"
                                                            >
                                                                <Download size={14} />
                                                                Exportar JSON
                                                            </button>
                                                            <label className="flex-1 py-2 px-3 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 hover:bg-purple-200 transition-colors cursor-pointer">
                                                                <UploadCloud size={14} />
                                                                Importar Procesado
                                                                <input
                                                                    type="file"
                                                                    accept=".json"
                                                                    onChange={handleImportProcessedCatalog}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={handleEnableDiscovery}
                                                        className="w-full p-4 border border-dashed border-emerald-300 rounded-xl flex items-center justify-center gap-3 text-emerald-600 hover:bg-emerald-50 transition-all mb-4 group"
                                                    >
                                                        <Download size={20} className="group-hover:bounce" />
                                                        <div className="text-left">
                                                            <p className="font-bold text-sm">Activar Modo Discovery</p>
                                                            <p className="text-[10px] font-bold opacity-70 italic tracking-tight">Descarga todo el catálogo (1300+) en 1 solo call</p>
                                                        </div>
                                                    </button>
                                                )}

                                                <div className="space-y-3">
                                                    {isSearchingOnline && (
                                                        <div className="text-center py-10 space-y-3">
                                                            <Loader2 className="animate-spin mx-auto text-emerald-500" size={32} />
                                                            <p className="text-sm font-bold text-slate-400">Buscando en ExerciseDB...</p>
                                                        </div>
                                                    )}

                                                    {!isSearchingOnline && onlineResults.length === 0 && (
                                                        <div className="text-center py-10 px-6">
                                                            <Search className="mx-auto text-slate-200 mb-4" size={48} />
                                                            <p className="text-sm font-bold text-slate-500">Busca ejercicios por nombre</p>
                                                            <p className="text-xs text-slate-400 mt-2 italic">Ej: "Bench Press", "Squat", "Pull up"...</p>
                                                        </div>
                                                    )}

                                                    {onlineResults.map(onlineEx => (
                                                        <div key={onlineEx.id} className="mb-2">
                                                            <ExerciseCard
                                                                ex={{
                                                                    ...onlineEx,
                                                                    source: 'exercisedb'
                                                                }}
                                                                showCheckbox={false}
                                                                showActions={false}
                                                                // Use onImport prop to show the Import button in the header
                                                                onImport={() => handleImportOnlineExercise(onlineEx)}
                                                            />
                                                        </div>
                                                    ))}

                                                    {/* Load More Button (Only in Discovery Mode) */}
                                                    {discoveryMode && onlineResults.length >= visibleCount && (
                                                        <button
                                                            onClick={() => setVisibleCount(prev => prev + 50)}
                                                            className="w-full py-3 bg-slate-100 text-slate-500 font-bold text-xs uppercase rounded-xl hover:bg-slate-200 transition-colors"
                                                        >
                                                            Cargar más resultados ({visibleCount} mostrados)
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Module Picker Modal (Simple List for now) */}
                        <AnimatePresence>
                            {modulePickerOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }}
                                    className="absolute inset-0 bg-white z-50 flex flex-col"
                                >
                                    <div className="p-4 border-b flex items-center gap-2">
                                        <h2 className="text-lg font-black text-slate-800 flex-1">Importar Módulo</h2>
                                        <button onClick={() => setModulePickerOpen(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                        {(() => {
                                            // Filter only new-style block modules (have 'name' and 'exercises')
                                            const blockModules = allModules.filter(mod => mod.name && mod.exercises);
                                            const atomicModules = allModules.filter(mod => !mod.name || !mod.exercises);

                                            return (
                                                <>
                                                    {blockModules.length === 0 && (
                                                        <div className="text-center py-10">
                                                            <p className="text-slate-400 mb-2">No hay módulos de bloque guardados</p>
                                                            <p className="text-xs text-slate-300">
                                                                Guarda un bloque usando el botón 💾 en cualquier bloque
                                                            </p>
                                                            {atomicModules.length > 0 && (
                                                                <p className="text-xs text-slate-300 mt-4">
                                                                    ({atomicModules.length} módulos antiguos no compatibles)
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {blockModules.map(mod => (
                                                        <div key={mod.id} onClick={() => importModule(mod)} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer group transition-all">
                                                            <div className="flex justify-between items-center mb-2">
                                                                <h4 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{mod.name}</h4>
                                                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{mod.exercises?.length || 0} Ejercicios</span>
                                                            </div>
                                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                                Progressive Density Program basado en {sessionType === 'PDP-T' ? 'Tiempo (DT)' : sessionType === 'PDP-R' ? 'Repeticiones (DR)' : 'EMOM (DE)'}.
                                                                Formato de trabajo: {
                                                                    sessionType === 'PDP-T' ? 'completar trabajos de calidad en ventanas de tiempo fijo.' :
                                                                        sessionType === 'PDP-R' ? 'completar reps target en el menor tiempo posible.' :
                                                                            'completar trabajo prescrito dentro del minuto.'
                                                                }
                                                            </p>
                                                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                                                {(mod.exercises || []).map(e => e.name).join(', ')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Exercise Config Drawer */}
                        <ExerciseConfigDrawer
                            isOpen={configDrawerOpen}
                            isSessionCardio={isCardio}
                            onClose={() => setConfigDrawerOpen(false)}
                            exercise={activeExerciseObj}
                            isGrouped={activeBlockIdx !== null && activeExIdx !== null && blocks[activeBlockIdx] && (
                                blocks[activeBlockIdx].exercises[activeExIdx]?.isGrouped ||
                                blocks[activeBlockIdx].exercises[activeExIdx + 1]?.isGrouped
                            )}
                            onSave={handleSaveConfig}
                        />

                        {/* Quick Exercise Creator Modal (Minimalist & Compact) */}
                        <AnimatePresence>
                            {quickCreatorOpen && (
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-0 md:p-4"
                                >
                                    <motion.div
                                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="absolute inset-0"
                                        onClick={() => setQuickCreatorOpen(false)}
                                    />

                                    <motion.div
                                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                                        className="bg-white w-full max-w-md md:rounded-3xl rounded-t-3xl shadow-xl flex flex-col relative z-10 overflow-hidden max-h-[85vh]"
                                    >
                                        {/* Header */}
                                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                                            <h3 className="font-bold text-slate-900">Nuevo Ejercicio</h3>
                                            <button
                                                onClick={() => setQuickCreatorOpen(false)}
                                                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                                            {/* Name Input */}
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Nombre</label>
                                                <input
                                                    value={creationData.name}
                                                    onChange={e => setCreationData({ ...creationData, name: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-slate-300 focus:bg-white transition-all transition-colors"
                                                    placeholder="Ej: Press de Banca"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Patrón</label>
                                                    <select
                                                        value={creationData.pattern}
                                                        onChange={e => setCreationData({ ...creationData, pattern: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                                    >
                                                        {PATTERNS.map(p => <option key={p} value={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Equipamiento</label>
                                                    <select
                                                        value={creationData.equipment}
                                                        onChange={e => setCreationData({ ...creationData, equipment: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                                    >
                                                        {EQUIPMENT.map(e => <option key={e} value={e}>{e}</option>)}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Nivel</label>
                                                    <select
                                                        value={creationData.level}
                                                        onChange={e => setCreationData({ ...creationData, level: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                                    >
                                                        {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Grupo</label>
                                                    <select
                                                        value={creationData.group}
                                                        onChange={e => setCreationData({ ...creationData, group: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                                    >
                                                        <option value="">Sin agrupar</option>
                                                        {exerciseGroups.map(g => (
                                                            <option key={g.id || g.name} value={g.name}>{g.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 px-1">Cualidad</label>
                                                <select
                                                    value={creationData.quality}
                                                    onChange={e => setCreationData({ ...creationData, quality: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none cursor-pointer"
                                                >
                                                    {QUALITIES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
                                                </select>
                                            </div>

                                            {/* Minimal External Weight Toggle */}
                                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <label className="text-xs font-bold text-slate-700">⚖️ Ejercicio con carga externa</label>
                                                <input
                                                    type="checkbox"
                                                    checked={creationData.loadable || false}
                                                    onChange={e => setCreationData({ ...creationData, loadable: e.target.checked })}
                                                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                                />
                                            </div>

                                            {/* Media */}
                                            <div className="space-y-3 pt-2">
                                                <div className="grid grid-cols-1 gap-3">
                                                    <ImageUploadInput
                                                        label="Media URL"
                                                        value={creationData.mediaUrl}
                                                        onChange={(val) => setCreationData(prev => ({ ...prev, mediaUrl: val }))}
                                                        placeholder="URL imagen/GIF..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <ImageUploadInput
                                                        label="Inicio"
                                                        value={creationData.imageStart}
                                                        onChange={(val) => setCreationData(prev => ({ ...prev, imageStart: val }))}
                                                    />
                                                    <ImageUploadInput
                                                        label="Fin"
                                                        value={creationData.imageEnd}
                                                        onChange={(val) => setCreationData(prev => ({ ...prev, imageEnd: val }))}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold uppercase text-slate-400 px-1">YouTube / Notas</label>
                                                <div className="space-y-2">
                                                    <input
                                                        value={creationData.youtubeUrl}
                                                        onChange={e => setCreationData({ ...creationData, youtubeUrl: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none"
                                                        placeholder="YouTube enlace..."
                                                    />
                                                    <textarea
                                                        value={creationData.description}
                                                        onChange={e => setCreationData({ ...creationData, description: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-medium outline-none h-20 resize-none"
                                                        placeholder="Descripción..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <div className="p-5 bg-white shrink-0">
                                            <button
                                                onClick={handleCreateAndSelect}
                                                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg active:scale-95"
                                            >
                                                Guardar y Añadir
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}

                {/* NUTRITION MODE CONTENT */}
                {
                    globalMode === 'NUTRITION' && (
                        <>
                            <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
                                {/* Nutrition Tabs */}
                                <div className="bg-slate-900 text-white p-2 shadow-lg z-10 border-t border-slate-800">
                                    <div className="flex justify-center gap-2">
                                        {['FOODS', 'RECIPES', 'DAYS'].map(view => (
                                            <button
                                                key={view}
                                                onClick={() => setNutritionView(view)}
                                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${nutritionView === view
                                                    ? 'bg-white text-slate-900'
                                                    : 'text-slate-400 hover:bg-white/10'}`}
                                            >
                                                {view === 'FOODS' && <Utensils size={14} />}
                                                {view === 'RECIPES' && <ChefHat size={14} />}
                                                {view === 'DAYS' && <Calendar size={14} />}
                                                {view === 'FOODS' ? 'Alimentos' : view === 'RECIPES' ? 'Recetas' : 'Días'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 relative overflow-hidden flex flex-col">
                                    {nutritionView === 'FOODS' && <FoodLibrary />}
                                    {nutritionView === 'RECIPES' && <RecipeEditor />}
                                    {nutritionView === 'DAYS' && (
                                        <>
                                            <div className="h-full p-6 overflow-y-auto w-full">
                                                <div className="max-w-5xl mx-auto w-full">
                                                    <div className="flex justify-between items-center mb-8">
                                                        <h2 className="text-3xl font-black text-slate-900">Plantillas de Días</h2>
                                                        <p className="text-slate-500 font-medium text-sm">Crea estructuras de comidas para usar en planes.</p>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <div className="relative w-64">
                                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                            <input
                                                                type="text"
                                                                value={daySearchTerm}
                                                                onChange={e => setDaySearchTerm(e.target.value)}
                                                                placeholder="Buscar días..."
                                                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleCreateNutritionDay}
                                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-indigo-200"
                                                        >
                                                            <Plus size={18} /> Nuevo Día
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                                    {allNutritionDays
                                                        .filter(d => d.id) // Filter out ghosts
                                                        .filter(d => d.name.toLowerCase().includes(daySearchTerm.toLowerCase()))
                                                        .map(day => (
                                                            <div key={day.id} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group flex flex-col justify-between min-h-[160px]">
                                                                <div>
                                                                    <div className="flex justify-between items-start mb-4">
                                                                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                                                            <Calendar size={20} />
                                                                        </div>
                                                                        <ActionMenu actions={[
                                                                            { label: 'Editar', icon: <Edit2 size={16} />, onClick: () => handleEditNutritionDay(day) },
                                                                            { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicateNutritionDay(day) },
                                                                            { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDeleteNutritionDay(day.id), variant: 'danger' }
                                                                        ]} />
                                                                    </div>
                                                                    <h3 className="font-black text-lg text-slate-900 leading-tight mb-1">{day.name}</h3>
                                                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                                                        {(day.meals || []).length} comidas
                                                                    </p>
                                                                </div>
                                                                <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                                                                    {(day.meals || []).slice(0, 3).map((m, i) => (
                                                                        <span key={i} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                                                                            {m.name}
                                                                        </span>
                                                                    ))}
                                                                    {(day.meals?.length > 3) && <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">+{day.meals.length - 3}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                                {isDayEditorOpen && (
                                                    <>
                                                        <motion.div
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110]"
                                                            onClick={() => setIsDayEditorOpen(false)}
                                                        />
                                                        <DayEditor
                                                            isOpen={true}
                                                            onClose={() => setIsDayEditorOpen(false)}
                                                            initialDayId={activeDayId}
                                                            onSave={handleNutritionDaySave}
                                                            availableDays={allNutritionDays}
                                                        />
                                                    </>
                                                )}
                                            </AnimatePresence>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )
                }
            </div>

            {/* Session Preview Modal */}
            <SessionPreviewModal
                session={previewingSession}
                isOpen={!!previewingSession}
                onClose={() => setPreviewingSession(null)}
            />
        </>
    );
};

export default GlobalCreator;
