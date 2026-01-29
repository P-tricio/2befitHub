import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

const ActionMenu = ({ actions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState({});
    const containerRef = useRef(null);
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);

    // Calculate position when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const menuHeight = 48 * actions.length;
            const menuWidth = 192;

            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const openUpward = spaceBelow < menuHeight + 16;

            setMenuStyle({
                position: 'fixed',
                zIndex: 99999,
                top: openUpward ? 'auto' : `${buttonRect.bottom + 4}px`,
                bottom: openUpward ? `${window.innerHeight - buttonRect.top + 4}px` : 'auto',
                left: `${Math.min(buttonRect.left, window.innerWidth - menuWidth - 16)}px`,
            });
        }
    }, [isOpen, actions.length]);

    // Close on outside click or scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleClose = (e) => {
            // Check if click is outside both button and dropdown
            const clickedButton = buttonRef.current?.contains(e.target);
            const clickedDropdown = dropdownRef.current?.contains(e.target);

            if (!clickedButton && !clickedDropdown) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => setIsOpen(false);

        // Delay to prevent immediate close
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClose);
            document.addEventListener('touchstart', handleClose);
            window.addEventListener('scroll', handleScroll, true);
        }, 10);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClose);
            document.removeEventListener('touchstart', handleClose);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleButtonClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(!isOpen);
    };

    const handleActionClick = (e, action) => {
        e.stopPropagation();
        e.preventDefault();
        setIsOpen(false);
        action.onClick(e);
    };

    return (
        <div ref={containerRef}>
            <button
                ref={buttonRef}
                onClick={handleButtonClick}
                onPointerDown={(e) => e.stopPropagation()}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && createPortal(
                <AnimatePresence>
                    <motion.div
                        ref={dropdownRef}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                        className="w-48 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                        style={menuStyle}
                    >
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => handleActionClick(e, action)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-slate-50 transition-colors ${action.variant === 'danger' ? 'text-red-500 hover:bg-red-50' : 'text-slate-700'
                                    }`}
                            >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                            </button>
                        ))}
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default ActionMenu;
