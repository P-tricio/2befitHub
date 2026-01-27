import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, Inbox, BellOff, Activity, Dumbbell, BarChart3, Notebook, SquareCheck, AlertCircle, UserPlus, Sparkles } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const NotificationBell = ({ recipientId, onNotificationClick }) => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!recipientId) return;

        const unsubscribe = TrainingDB.notifications.listen(recipientId, (data) => {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        });

        return () => unsubscribe();
    }, [recipientId]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkAsRead = async (e, id) => {
        e.stopPropagation();
        try {
            await TrainingDB.notifications.markAsRead(id);
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await TrainingDB.notifications.markAllAsRead(recipientId);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const handleSelect = (noti) => {
        if (!noti.read) {
            TrainingDB.notifications.markAsRead(noti.id);
        }

        if (onNotificationClick) {
            onNotificationClick(noti);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-all ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white ring-1 ring-rose-500/20"
                    >
                        {unreadCount > 9 ? '+9' : unreadCount}
                    </motion.span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                    >
                        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h4 className="font-black text-slate-900">Notificaciones</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actividad reciente</p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    className="ml-auto text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest pl-2"
                                >
                                    Marcar Todo
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-10 text-center space-y-3">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                                        <BellOff size={32} />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">No hay notificaciones</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map((noti) => (
                                        <div
                                            key={noti.id}
                                            onClick={() => handleSelect(noti)}
                                            className={`p-4 flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors relative group ${!noti.read ? 'bg-slate-50/30' : ''}`}
                                        >
                                            {!noti.read && (
                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                            )}

                                            {(() => {
                                                const actualType = noti.type === 'task_completion' ? (noti.data?.type || 'session') : noti.type;
                                                const getStyle = (type, priority) => {
                                                    if (priority === 'high') return { bg: 'bg-orange-50', text: 'text-orange-500', icon: <AlertCircle size={18} /> };
                                                    switch (type) {
                                                        case 'session':
                                                        case 'free_training':
                                                        case 'neat':
                                                        case 'assignment':
                                                        case 'task_completion':
                                                            return { bg: 'bg-emerald-50', text: 'text-emerald-500', icon: <Dumbbell size={18} /> };
                                                        case 'tracking':
                                                        case 'checkin':
                                                            return { bg: 'bg-blue-50', text: 'text-blue-500', icon: <BarChart3 size={18} /> };
                                                        case 'form':
                                                        case 'form_submission':
                                                            return { bg: 'bg-purple-50', text: 'text-purple-500', icon: <Notebook size={18} /> };
                                                        case 'habit':
                                                        case 'nutrition':
                                                            return { bg: 'bg-amber-50', text: 'text-amber-500', icon: <SquareCheck size={18} /> };
                                                        case 'new_user':
                                                        case 'registration':
                                                            return { bg: 'bg-indigo-50', text: 'text-indigo-500', icon: <UserPlus size={18} /> };
                                                        default: return { bg: 'bg-slate-50', text: 'text-slate-500', icon: <Activity size={18} /> };
                                                    }
                                                };
                                                const style = getStyle(actualType, noti.priority);
                                                return (
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                                                        {style.icon}
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-xs font-black leading-tight ${!noti.read ? 'text-slate-900' : 'text-slate-500'}`}>
                                                        {noti.title}
                                                    </p>
                                                    <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">
                                                        {formatDistanceToNow(noti.createdAt, { addSuffix: false, locale: es })}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                    {noti.athleteName ? <span className="font-bold text-slate-700">{noti.athleteName}: </span> : ''}
                                                    {noti.message}
                                                </p>
                                            </div>

                                            {!noti.read && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(e, noti.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-white shadow-sm border border-slate-100 rounded-lg text-slate-400 hover:text-emerald-500 transition-all shrink-0 self-center"
                                                    title="Marcar como leída"
                                                >
                                                    <Check size={14} strokeWidth={3} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {notifications.length > 0 && (
                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
                                <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                    Ver todo el historial
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
