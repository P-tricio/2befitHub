import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, ChevronDown, ChevronUp, Copy, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseAPI } from '../../services/exerciseApi';
import ExerciseMedia from '../../components/ExerciseMedia';

/**
 * Pattern color utility - returns Tailwind classes for each movement pattern
 */
export const getPatternColor = (pattern) => {
    switch (pattern) {
        case 'Squat': return 'bg-blue-100 text-blue-700';
        case 'Hinge': return 'bg-orange-100 text-orange-700';
        case 'Push': return 'bg-red-100 text-red-700';
        case 'Pull': return 'bg-cyan-100 text-cyan-700';
        case 'Lunge': return 'bg-purple-100 text-purple-700';
        case 'Carry': return 'bg-amber-100 text-amber-700';
        case 'Core': return 'bg-teal-100 text-teal-700';
        case 'Global': return 'bg-pink-100 text-pink-700';
        default: return 'bg-slate-100 text-slate-600';
    }
};

/**
 * ActionMenu - Dropdown menu for exercise actions
 */
const ActionMenu = ({ actions }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                </svg>
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            className="absolute right-0 top-8 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50 min-w-[140px]"
                        >
                            {actions.map((action, i) => (
                                <button
                                    key={i}
                                    onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-colors ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-slate-600'}`}
                                >
                                    {action.icon}
                                    {action.label}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * ExerciseCard - Reusable collapsible exercise card component
 * 
 * @param {object} ex - Exercise object
 * @param {boolean} isSelected - Whether the card is selected
 * @param {function} onToggleSelect - Callback for selection toggle
 * @param {function} onEdit - Callback for edit action
 * @param {function} onDelete - Callback for delete action
 * @param {function} onDuplicate - Callback for duplicate action
 * @param {boolean} showCheckbox - Whether to show selection checkbox
 * @param {boolean} showActions - Whether to show action menu
 * @param {function} onClick - Optional click handler (for selection mode)
 */
const ExerciseCard = ({
    ex,
    isSelected = false,
    onToggleSelect,
    onEdit,
    onDelete,
    onDuplicate,
    showCheckbox = true,
    showActions = true,
    onClick
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const handleCardClick = () => {
        if (onClick) {
            onClick(ex);
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    // Extract YouTube video ID from URL
    const getYoutubeVideoId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div className={`group bg-white rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 ${isSelected ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10' : 'border-slate-100'} ${isExpanded ? 'p-4' : 'p-3'}`}>
            {/* Header - Always visible */}
            <div className="flex justify-between items-center cursor-pointer" onClick={handleCardClick}>
                <div className="flex items-center gap-3 overflow-hidden">
                    {showCheckbox && onToggleSelect && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => { e.stopPropagation(); onToggleSelect(); }}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                        />
                    )}

                    {/* Thumbnail Image (shown when collapsed) */}
                    {!isExpanded && (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                            <ExerciseMedia exercise={ex} thumbnailMode={true} />
                        </div>
                    )}

                    <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-slate-900 text-sm truncate leading-tight" title={ex.name_es || ex.name}>{ex.name_es || ex.name}</h3>
                        {!isExpanded && (
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${getPatternColor(ex.pattern)}`}>{ex.pattern}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {showActions && (onEdit || onDuplicate || onDelete) && (
                        <div className="mr-2">
                            <ActionMenu actions={[
                                ...(onEdit ? [{ label: 'Editar', icon: <Edit2 size={16} />, onClick: onEdit }] : []),
                                ...(onDuplicate ? [{ label: 'Duplicar', icon: <Copy size={16} />, onClick: onDuplicate }] : []),
                                ...(onDelete ? [{ label: 'Eliminar', icon: <Trash2 size={16} />, onClick: onDelete, variant: 'danger' }] : [])
                            ]} />
                        </div>
                    )}
                    <button className="text-slate-400 hover:text-slate-600">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 overflow-hidden"
                    >
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-wider ${getPatternColor(ex.pattern)}`}>
                                {ex.pattern}
                            </span>
                            {ex.level && (
                                <span className="px-2 py-1 bg-slate-100 rounded-md text-[10px] uppercase font-bold text-slate-500">
                                    {ex.level}
                                </span>
                            )}
                            {ex.equipment && (
                                <span className="px-2 py-1 bg-slate-50 rounded-md text-[10px] uppercase font-bold text-slate-400 border border-slate-100">
                                    {ex.equipment}
                                </span>
                            )}
                            {(ex.tags || []).map((tag, i) => (
                                <span key={i} className="px-2 py-1 bg-blue-50/50 rounded-md text-[10px] uppercase font-bold text-blue-400 border border-blue-100">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* GIF/Video Preview */}
                        <div className="aspect-square bg-slate-50 rounded-2xl mb-4 flex items-center justify-center overflow-hidden relative border border-slate-100">
                            <ExerciseMedia exercise={ex} />
                        </div>

                        {(ex.description || (ex.instructions_es && ex.instructions_es.length > 0) || (ex.instructions && ex.instructions.length > 0)) && (
                            <p className="text-xs text-slate-500 italic mb-2 line-clamp-3">
                                {ex.description || (ex.instructions_es?.join(' ')) || (ex.instructions?.join(' ')) || ''}
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ExerciseCard;
