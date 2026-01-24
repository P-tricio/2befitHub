import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, ShieldCheck } from 'lucide-react';
import { TrainingDB } from '../services/db';
import { useAuth } from '../../../context/AuthContext';

const ChatDrawer = ({ isOpen, onClose, athleteId, athleteName }) => {
    const { currentUser } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 w-full max-w-md bg-white shadow-2xl z-[250] flex flex-col h-full border-l border-slate-100 sm:rounded-l-[32px] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shadow-sm z-10 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-inner shrink-0 overflow-hidden ${athleteName === 'Tu Coach' ? 'bg-slate-900' : 'bg-indigo-50 text-indigo-600'}`}>
                                    {athleteName === 'Tu Coach' ? (
                                        <img src="/brand-compact.png" alt="Coach" className="w-6 h-auto brightness-0 invert" />
                                    ) : (
                                        athleteName?.[0] || 'A'
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                                        {athleteName || 'Chat'}
                                    </h2>
                                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.1em] mt-1">Canal Directo</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-900">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 bg-slate-50/30 space-y-4"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                    <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-4 text-slate-200">
                                        <Send size={32} />
                                    </div>
                                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest italic">
                                        No hay mensajes aún. Di hola.
                                    </p>
                                </div>
                            ) : (
                                messages.map((msg, idx) => {
                                    const isMe = msg.senderId === currentUser.uid;
                                    return (
                                        <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] space-y-1`}>
                                                <div className={`p-4 rounded-[24px] text-sm font-medium shadow-sm transition-all ${isMe
                                                    ? 'bg-slate-900 text-white rounded-tr-none shadow-slate-900/10'
                                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                                <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                                                        {msg.timestamp ? new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(msg.timestamp) : ''}
                                                    </span>
                                                    {!isMe && <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{athleteName === 'Tu Coach' ? 'Coach' : 'Soporte'}</span>}
                                                    {isMe && <ShieldCheck size={10} className="text-emerald-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                            <form onSubmit={handleSend} className="relative flex items-center gap-3">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Escribe un mensaje..."
                                    className="flex-1 bg-slate-50 border-none rounded-[20px] py-4 pl-6 pr-14 text-sm font-medium focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all placeholder:text-slate-300"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="absolute right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-900/20 active:scale-90 transition-all disabled:opacity-50 disabled:shadow-none"
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
