import React from 'react';
import { motion } from 'framer-motion';

const RPE_LEVELS = [
    { val: 0, label: 'Descanso', color: 'bg-emerald-500', text: 'text-emerald-500' },
    { val: 1, label: 'Muy Fácil', color: 'bg-emerald-500', text: 'text-emerald-500' },
    { val: 2, label: 'Muy Fácil', color: 'bg-emerald-500', text: 'text-emerald-500' },
    { val: 3, label: 'Fácil', color: 'bg-emerald-400', text: 'text-emerald-400' },
    { val: 4, label: 'Fácil', color: 'bg-emerald-400', text: 'text-emerald-400' },
    { val: 5, label: 'Moderado', color: 'bg-amber-400', text: 'text-amber-400' },
    { val: 6, label: 'Moderado', color: 'bg-amber-500', text: 'text-amber-500' },
    { val: 7, label: 'Duro', color: 'bg-orange-500', text: 'text-orange-500' },
    { val: 8, label: 'Muy Duro', color: 'bg-orange-600', text: 'text-orange-600' },
    { val: 9, label: 'Casi al Fallo', color: 'bg-red-500', text: 'text-red-500' },
    { val: 10, label: 'Máximo / Fallo', color: 'bg-red-600', text: 'text-red-600' },
];

const RPESelector = ({ value, onChange, label = "Esfuerzo (RPE)" }) => {
    const currentLevel = RPE_LEVELS.find(l => l.val === value) || { label: '-', text: 'text-slate-400' };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end px-1">
                <div className="space-y-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</span>
                    <motion.span
                        key={currentLevel.label}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-xs font-bold uppercase tracking-widest ${currentLevel.text}`}
                    >
                        {currentLevel.label}
                    </motion.span>
                </div>
                <motion.span
                    key={value}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="text-4xl font-black text-slate-900 tabular-nums"
                >
                    {value !== null ? value : '-'}
                </motion.span>
            </div>

            <div className="flex justify-between gap-1 pt-1">
                {RPE_LEVELS.map((level) => {
                    const isSelected = value === level.val;
                    return (
                        <motion.button
                            key={level.val}
                            onClick={() => onChange(level.val)}
                            whileTap={{ scale: 0.9 }}
                            animate={{
                                scale: isSelected ? 1.2 : 1,
                                zIndex: isSelected ? 20 : 1
                            }}
                            className={`flex-1 h-12 rounded-xl font-black text-[10px] sm:text-xs transition-colors flex items-center justify-center border-2 relative
                                ${isSelected
                                    ? `${level.color} text-white border-transparent shadow-lg shadow-${level.color.split('-')[1]}-500/20`
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                }
                            `}
                        >
                            {level.val}
                            {isSelected && (
                                <motion.div
                                    layoutId="rpe-active"
                                    className="absolute inset-0 rounded-xl ring-2 ring-offset-2 ring-slate-900/5 shadow-inner"
                                    transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
                                />
                            )}
                        </motion.button>
                    );
                })}
            </div>

            <div className="flex justify-between px-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">
                <span>Muy Suave</span>
                <span>Moderado</span>
                <span>Máximo</span>
            </div>
        </div>
    );
};

export default RPESelector;
