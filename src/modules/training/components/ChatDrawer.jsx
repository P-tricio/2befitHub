import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, ShieldCheck, ChevronDown } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { useAuth } from '../../../context/AuthContext';

const ChatDrawer = ({ isOpen, onClose, athleteId, athleteName }) => {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen || !athleteId) return;

        setLoading(true);
        const unsubscribe = TrainingDB.messages.listen(athleteId, (msgs) => {
            setMessages(msgs);
            setLoading(false);

            // Mark unread messages from others as read
            msgs.forEach(msg => {
                if (!msg.read && msg.senderId !== currentUser.uid) {
                    TrainingDB.messages.markAsRead(athleteId, msg.id);
                }
            });
        });

        return () => unsubscribe();
    }, [isOpen, athleteId, currentUser.uid]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const text = inputText.trim();
        setInputText('');

        try {
            await TrainingDB.messages.send(athleteId, currentUser.uid, text);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (Click to close) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[200]"
                    />

                    {/* Floating Panel / Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`
                            fixed z-[250] bg-white shadow-2xl flex flex-col overflow-hidden
                            /* Mobile: Bottom Sheet */
                            bottom-0 left-0 right-0 h-[85vh] rounded-t-[32px]
                            /* Desktop: Floating Card */
                            md:bottom-6 md:right-6 md:left-auto md:w-[400px] md:h-[600px] md:rounded-[32px] md:border md:border-slate-100
                        `}
                    >
                        {/* Header */}
                        <div className="p-4 pt-3 border-b border-slate-100 flex flex-col bg-white shrink-0 relative">
                            {/* Mobile Drag Handle Visual */}
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />

                            <div className="flex justify-between items-center px-1">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-sm shrink-0 overflow-hidden ${athleteName === 'Tu Coach' ? 'bg-slate-900' : 'bg-indigo-50 text-indigo-600'}`}>
                                        {athleteName === 'Tu Coach' ? (
                                            <img src="/brand-compact.png" alt="Coach" className="w-5 h-auto brightness-0 invert" />
                                        ) : (
                                            athleteName?.[0] || 'A'
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
                                            {athleteName || 'Chat'}
                                        </h2>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">En línea</p>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900"
                                >
                                    {/* Chevron Down on Mobile (implies "dismiss"), X on Desktop */}
                                    <div className="md:hidden"><ChevronDown size={20} /></div>
                                    <div className="hidden md:block"><X size={20} /></div>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent animate-spin rounded-full" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-60">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-3 text-slate-300">
                                        <Send size={20} />
                                    </div>
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">
                                        Inicia la conversación
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUser.uid;
                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] space-y-1`}>
                                                <div className={`p-3.5 px-5 rounded-[20px] text-sm font-medium shadow-sm transition-all ${isMe
                                                    ? 'bg-slate-900 text-white rounded-tr-md shadow-slate-900/5'
                                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-md'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                                <div className={`flex items-center gap-1.5 px-1 opacity-60 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {msg.timestamp ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(msg.timestamp) : ''}
                                                    </span>
                                                    {isMe && <ShieldCheck size={10} className="text-emerald-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            <form onSubmit={handleSend} className="relative flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Escribe algo..."
                                    className="flex-1 bg-slate-50 border-none rounded-2xl py-3.5 pl-5 pr-12 text-sm font-medium focus:ring-2 focus:ring-slate-900/10 outline-none transition-all placeholder:text-slate-300"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="absolute right-1.5 p-2 bg-slate-900 text-white rounded-xl shadow-md shadow-slate-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-emerald-500 hover:shadow-emerald-500/20"
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ChatDrawer;
