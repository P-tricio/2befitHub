import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ActionMenu = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
    const [openUpward, setOpenUpward] = useState(false);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const menuHeight = 50 * actions.length; // Approximate: 50px per item
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const shouldOpenUpward = spaceBelow < menuHeight + 20;

            setOpenUpward(shouldOpenUpward);

            // Calculate fixed position
            if (shouldOpenUpward) {
                setMenuPosition({
                    top: buttonRect.top - menuHeight - 8,
                    right: window.innerWidth - buttonRect.right
                });
            } else {
                setMenuPosition({
                    top: buttonRect.bottom + 4,
                    right: window.innerWidth - buttonRect.right
                });
            }
        }
    }, [isOpen, actions.length]);

    return (
        <div className="relative" ref={menuRef}>
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
                <MoreVertical size={20} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: openUpward ? 10 : -10 }}
                        transition={{ duration: 0.1 }}
                        className="fixed w-48 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-[9999]"
                        style={{
                            top: `${menuPosition.top}px`,
                            right: `${menuPosition.right}px`
                        }}
                    >
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    action.onClick(e);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-slate-700'
                                    }`}
                            >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ActionMenu;
