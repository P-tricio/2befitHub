import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * FilterDropdown - Custom dropdown component for filter categories
 */
const FilterDropdown = ({ label, options, category, selectedValues, onToggle, isMulti = true, icon, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeCount = selectedValues ? selectedValues.length : 0;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-[10px] md:text-xs font-bold ${activeCount > 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
            >
                <div className="flex items-center gap-2 truncate">
                    {icon && <span className="opacity-50">{icon}</span>}
                    <span className="truncate">{activeCount > 0 ? `${label}: ${activeCount}` : label}</span>
                </div>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[110] max-h-60 overflow-y-auto"
                    >
                        <div className="grid grid-cols-1 gap-1">
                            {options.map(opt => {
                                const value = typeof opt === 'string' ? opt : opt.id;
                                const display = typeof opt === 'string' ? opt : opt.label;
                                const isSelected = selectedValues ? selectedValues.includes(value) : false;

                                return (
                                    <button
                                        key={value}
                                        onClick={() => {
                                            onToggle(category, value);
                                            if (!isMulti) setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] md:text-xs font-bold transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span className="truncate">{display}</span>
                                        {isSelected && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterDropdown;
