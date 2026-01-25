import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Search, MessageCircle, Send, User as UserIcon, Check, ChevronLeft, ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const AdminChatManager = ({ isOpen, onClose, onUserClick }) => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);
    const dragControls = useDragControls();

    // Fetch Users
    useEffect(() => {
        if (!isOpen) return;

        // Fetch all users to ensure we can chat with anyone (even if no history)
        const q = collection(db, 'users');
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Client-side sort: Recent messages first, then alphabetical
            usersList.sort((a, b) => {
                const timeA = a.lastMessageAt?.toMillis() || 0;
                const timeB = b.lastMessageAt?.toMillis() || 0;
                if (timeB !== timeA) return timeB - timeA;
                return (a.displayName || '').localeCompare(b.displayName || '');
            });

            setUsers(usersList);
            setFilteredUsers(usersList);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen]);

    // Filter Users
    useEffect(() => {
        if (!searchText.trim()) {
            setFilteredUsers(users);
        } else {
            const lowerQuery = searchText.toLowerCase();
            setFilteredUsers(users.filter(u =>
                u.displayName?.toLowerCase().includes(lowerQuery) ||
                u.email?.toLowerCase().includes(lowerQuery)
            ));
        }
    }, [searchText, users]);

    // Load Chat when User Selected
    useEffect(() => {
        if (!selectedUser) return;

        // Reset Admin Unread Count when opening
        if (selectedUser.unreadAdmin > 0) {
            TrainingDB.messages.markConversationRead(selectedUser.id);
        }

        const unsubscribe = TrainingDB.messages.listen(selectedUser.id, (msgs) => {
            setMessages(msgs);

            // Mark unread messages from athlete as read
            msgs.forEach(msg => {
                if (!msg.read && msg.senderId === selectedUser.id) {
                    TrainingDB.messages.markAsRead(selectedUser.id, msg.id);
                }
            });
        });

        return () => unsubscribe();
    }, [selectedUser]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedUser) return;

        const text = inputText.trim();
        setInputText('');

        try {
            await TrainingDB.messages.send(selectedUser.id, currentUser.uid, text);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    const handleClose = () => {
        setSelectedUser(null);
        onClose();
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
                        onClick={handleClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200]"
                    />

                    {/* Floating Panel Container */}
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.8 }}
                        onDragEnd={(e, info) => {
                            if (info.offset.y > 100) handleClose();
                        }}
                        className={`
                            fixed z-[250] bg-white shadow-2xl overflow-hidden flex flex-col items-stretch
                            /* Mobile: Bottom Sheet */
                            bottom-0 left-0 right-0 h-[85vh] rounded-t-[32px]
                            /* Desktop: Floating Large Card */
                            md:bottom-6 md:right-6 md:left-auto md:w-[800px] md:h-[600px] md:rounded-[32px] md:border md:border-slate-100 md:flex-row
                        `}
                    >
                        {/* LEFT PANEL: User List */}
                        <div className={`
                            flex flex-col bg-white border-r border-slate-100
                            /* Mobile: Hide if chat open */
                            ${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-80 h-full
                        `}>
                            {/* Header (Drag Handle) */}
                            <div
                                onPointerDown={(e) => dragControls.start(e)}
                                className="p-4 pt-3 border-b border-slate-100 flex flex-col bg-white shrink-0 cursor-grab active:cursor-grabbing touch-none"
                            >
                                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4 md:hidden" />
                                <div className="flex justify-between items-center px-1">
                                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Mensajes</h2>
                                    <button onClick={handleClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 md:hidden">
                                        <ChevronDown size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="p-3 bg-white shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar atleta..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {loading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent animate-spin rounded-full" />
                                    </div>
                                ) : filteredUsers.length === 0 ? (
                                    <div className="text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        No se encontraron atletas
                                    </div>
                                ) : (
                                    filteredUsers.map(user => {
                                        const isActive = selectedUser?.id === user.id;
                                        const hasUnread = user.unreadAdmin > 0;

                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => setSelectedUser(user)}
                                                className={`w-full p-3 rounded-[20px] text-left transition-all group flex items-start gap-3 relative ${isActive ? 'bg-slate-900 shadow-md shadow-slate-900/10' : 'hover:bg-slate-50'}`}
                                            >
                                                <div className="relative shrink-0">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${isActive ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserIcon size={20} />
                                                        )}
                                                    </div>
                                                    {hasUnread && (
                                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[7px] font-black text-white">
                                                            {user.unreadAdmin}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h3 className={`font-black text-sm truncate pr-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                            {user.displayName || 'Atleta'}
                                                        </h3>
                                                        <span className={`text-[9px] font-bold shrink-0 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                                                            {user.lastMessageAt ? formatDistanceToNow(user.lastMessageAt.toDate(), { addSuffix: false, locale: es }).replace('alrededor de ', '') : ''}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs truncate font-medium ${hasUnread && !isActive ? 'text-slate-900 font-bold' : isActive ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {user.lastMessage || <span className="italic opacity-50">Sin mensajes</span>}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Chat Area */}
                        <div className={`
                            flex-col bg-white h-full
                            /* Mobile: Show only if user selected */
                            ${selectedUser ? 'flex w-full' : 'hidden md:flex flex-1'}
                        `}>
                            {selectedUser ? (
                                <>
                                    {/* Chat Header (Drag Handle) */}
                                    <div
                                        onPointerDown={(e) => dragControls.start(e)}
                                        className="p-4 pt-3 border-b border-slate-100 flex items-center gap-3 shadow-sm z-10 bg-white shrink-0 relative cursor-grab active:cursor-grabbing touch-none"
                                    >
                                        <div className="md:hidden w-12 h-1 bg-slate-200 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />

                                        {/* Back Button (Mobile Only) */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUser(null);
                                            }}
                                            className="p-2 -ml-2 text-slate-400 hover:text-slate-900 mt-2 md:mt-0 md:hidden"
                                        >
                                            <ChevronLeft size={24} />
                                        </button>

                                        <div
                                            className="flex items-center gap-3 mt-2 md:mt-0 cursor-pointer group/header"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUserClick?.(selectedUser);
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 transition-transform group-hover/header:scale-105 shadow-sm">
                                                {selectedUser.photoURL ? (
                                                    <img src={selectedUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                                ) : (
                                                    <UserIcon size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-black text-slate-900 text-sm leading-none group-hover/header:text-emerald-500 transition-colors uppercase tracking-tight">
                                                    {selectedUser.displayName}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    {(() => {
                                                        const lastActiveAt = selectedUser.lastActiveAt;
                                                        const isOnline = lastActiveAt && (
                                                            (lastActiveAt instanceof Date ? lastActiveAt.getTime() : lastActiveAt.toMillis?.() || 0) > Date.now() - 4 * 60 * 1000
                                                        );
                                                        const lastActiveText = !isOnline && lastActiveAt ? (
                                                            `Hace ${Math.abs(Math.round(((lastActiveAt instanceof Date ? lastActiveAt.getTime() : lastActiveAt.toMillis?.() || 0) - Date.now()) / 60000))} min`
                                                        ) : null;

                                                        return (
                                                            <>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                                                <p className="text-slate-400 text-[9px] font-black uppercase tracking-wider">
                                                                    {isOnline ? 'En línea' : lastActiveText || 'Desconectado'}
                                                                </p>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Desktop Close */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleClose();
                                            }}
                                            className="hidden md:block ml-auto p-2 hover:bg-slate-50 rounded-full text-slate-400"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Messages */}
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-4"
                                    >
                                        {messages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                                                    <MessageCircle size={24} className="text-slate-300" />
                                                </div>
                                                <p className="text-xs font-bold uppercase tracking-wider">Inicia el chat</p>
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
                                                                {isMe && msg.read && <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5"><Check size={10} strokeWidth={4} /> LEÍDO</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Input */}
                                    <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                                        <form onSubmit={handleSend} className="relative flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                placeholder="Escribe un mensaje..."
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
                                </>
                            ) : (
                                <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300 p-8 text-center opacity-60">
                                    <img src="/brand-compact.png" alt="Logo" className="w-12 h-auto mb-4 grayscale opacity-20" />
                                    <h3 className="text-base font-black text-slate-400 mb-1">Gestor de Mensajes</h3>
                                    <p className="max-w-xs text-xs">Selecciona un atleta de la lista para ver su conversación.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AdminChatManager;
