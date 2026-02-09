import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers, Dumbbell, Clock, Repeat, Zap, ChevronRight } from 'lucide-react';

/**
 * SessionPreviewModal - Read-only viewer for session contents
 * Shows blocks and exercises without loading into editor
 */
const SessionPreviewModal = ({ session, isOpen, onClose }) => {
    if (!isOpen || !session) return null;

    const blocks = session.blocks || [];

    // Get protocol display info
    const getProtocolInfo = (block) => {
        const protocol = block.protocol || block.module?.protocol || 'LIBRE';
        const normalized = protocol.replace('PDP-', '').toUpperCase();

        const configs = {
            'T': { label: 'Time Cap', color: 'purple', icon: <Clock size={12} /> },
            'R': { label: 'Reps', color: 'blue', icon: <Repeat size={12} /> },
            'E': { label: 'EMOM', color: 'emerald', icon: <Zap size={12} /> },
            'LIBRE': { label: 'Libre', color: 'slate', icon: <Dumbbell size={12} /> },
        };

        return configs[normalized] || configs['LIBRE'];
    };

    // Get exercise summary text
    const getExerciseSummary = (ex) => {
        const parts = [];

        // Check for sets config
        if (ex.config?.sets?.length) {
            const sets = ex.config.sets;
            const reps = sets.map(s => s.reps || s.rep || '?').join('/');
            parts.push(`${sets.length}x${reps}`);
        } else if (ex.targetReps) {
            parts.push(`${ex.targetReps} reps`);
        } else if (ex.manifestation) {
            parts.push(ex.manifestation);
        }

        // Duration for cardio
        if (ex.duration) {
            const mins = Math.floor(ex.duration / 60);
            parts.push(`${mins}min`);
        }

        return parts.join(' • ') || '';
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                    onClick={onClose}
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative bg-white w-full max-w-lg max-h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-[110]"
                >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50 to-white">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <Layers size={16} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Vista Previa
                                </span>
                            </div>
                            <h2 className="text-xl font-black text-slate-900 truncate">
                                {session.name}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                {session.type && (
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider
                                        ${session.type === 'PDP-T' ? 'bg-purple-100 text-purple-600' :
                                            session.type === 'PDP-R' ? 'bg-blue-100 text-blue-600' :
                                                session.type === 'PDP-E' ? 'bg-emerald-100 text-emerald-600' :
                                                    session.type === 'Cardio' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-slate-100 text-slate-500'}`}
                                    >
                                        {session.type}
                                    </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400">
                                    {blocks.length} bloque{blocks.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shrink-0"
                        >
                            <X size={18} className="text-slate-500" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {blocks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Layers size={32} className="mx-auto mb-3 opacity-40" />
                                <p className="text-sm font-bold">Esta sesión no tiene bloques</p>
                            </div>
                        ) : (
                            blocks.map((block, blockIdx) => {
                                const protocolInfo = getProtocolInfo(block);
                                const exercises = block.module?.exercises || block.exercises || [];
                                const blockName = block.name || block.type || `Bloque ${blockIdx + 1}`;

                                return (
                                    <div
                                        key={block.id || blockIdx}
                                        className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden"
                                    >
                                        {/* Block Header */}
                                        <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center bg-${protocolInfo.color}-100 text-${protocolInfo.color}-600`}>
                                                    {protocolInfo.icon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{blockName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {protocolInfo.label}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                                                {exercises.length} ej.
                                            </span>
                                        </div>

                                        {/* Exercises List */}
                                        <div className="divide-y divide-slate-100">
                                            {exercises.length === 0 ? (
                                                <p className="p-3 text-xs text-slate-400 italic text-center">
                                                    Sin ejercicios
                                                </p>
                                            ) : (
                                                exercises.map((ex, exIdx) => {
                                                    const summary = getExerciseSummary(ex);
                                                    const isGrouped = ex.isGrouped;

                                                    return (
                                                        <div
                                                            key={ex.id || exIdx}
                                                            className={`p-3 flex items-center gap-3 ${isGrouped ? 'bg-blue-50/50 border-l-2 border-blue-400' : ''}`}
                                                        >
                                                            {isGrouped && (
                                                                <div className="w-4 flex items-center justify-center">
                                                                    <div className="w-0.5 h-4 bg-blue-300 rounded-full" />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-700 truncate">
                                                                    {ex.nameEs || ex.name || 'Ejercicio'}
                                                                </p>
                                                                {summary && (
                                                                    <p className="text-[10px] font-bold text-slate-400">
                                                                        {summary}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {ex.notes && (
                                                                <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                                    📝
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors active:scale-[0.98]"
                        >
                            Cerrar
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default SessionPreviewModal;
