import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, MessageCircle, Send, User as UserIcon, Check, ChevronLeft, ArrowRight } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { onSnapshot, collection, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const AdminChatManager = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    // Fetch Users with Chat Metadata (Real-time for unread counts)
    useEffect(() => {
        if (!isOpen) return;

        // In a real app complexity, we might want to paginate this or filter by 'hasMessages'
        // For MVP, we listen to all users to get real-time unread updates
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

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[250] flex h-full border-l border-slate-100 sm:rounded-l-[32px] overflow-hidden"
                    >
                        {/* LEFT PANEL: User List (Hidden on mobile if chat is open) */}
                        <div className={`w-full md:w-80 flex flex-col border-r border-slate-100 bg-white transition-all transform ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                            {/* Header */}
                            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Mensajes</h2>
                                <button onClick={handleClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors md:hidden">
                                    <X size={20} className="text-slate-400" />
                                </button>
                                <button onClick={handleClose} className="hidden md:block p-2 hover:bg-slate-50 rounded-full transition-colors">
                                    <ChevronLeft size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="p-4 bg-white shrink-0">
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
                                                className={`w-full p-3 rounded-2xl text-left transition-all group flex items-start gap-3 relative ${isActive ? 'bg-slate-900 shadow-lg shadow-slate-900/10' : 'hover:bg-slate-50'}`}
                                            >
                                                {/* Avatar */}
                                                <div className="relative shrink-0">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isActive ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                                                        {user.photoURL ? (
                                                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserIcon size={24} />
                                                        )}
                                                    </div>
                                                    {hasUnread && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[8px] font-black text-white">
                                                            {user.unreadAdmin}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h3 className={`font-black text-sm truncate pr-2 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                                            {user.displayName || 'Atleta Sin Nombre'}
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
                        <div className={`flex-1 flex-col bg-slate-50 ${selectedUser ? 'flex' : 'hidden md:flex'}`}>
                            {selectedUser ? (
                                <>
                                    {/* Chat Header */}
                                    <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-4 shadow-sm z-10">
                                        <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-900">
                                            <ChevronLeft size={24} />
                                        </button>
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                            {selectedUser.photoURL ? (
                                                <img src={selectedUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                <UserIcon size={20} className="text-slate-400" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">{selectedUser.displayName}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {selectedUser.email || 'Atleta'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Messages */}
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-6 space-y-4"
                                    >
                                        {messages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                                                    <MessageCircle size={32} className="text-slate-300" />
                                                </div>
                                                <p className="text-sm font-medium">Inicia la conversación</p>
                                            </div>
                                        ) : (
                                            messages.map((msg, idx) => {
                                                const isMe = msg.senderId === currentUser.uid;
                                                return (
                                                    <div key={msg.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] space-y-1`}>
                                                            <div className={`p-4 rounded-[20px] text-sm font-medium shadow-sm transition-all ${isMe
                                                                ? 'bg-slate-900 text-white rounded-tr-none shadow-slate-900/10'
                                                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                                                }`}>
                                                                {msg.text}
                                                            </div>
                                                            <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">
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
                                    <div className="p-4 bg-white border-t border-slate-100">
                                        <form onSubmit={handleSend} className="relative flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={inputText}
                                                onChange={(e) => setInputText(e.target.value)}
                                                placeholder="Escribe un mensaje..."
                                                className="flex-1 bg-slate-50 border-none rounded-[20px] py-4 pl-6 pr-14 text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300"
                                            />
                                            <button
                                                type="submit"
                                                disabled={!inputText.trim()}
                                                className="absolute right-2 p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20 active:scale-90 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-emerald-500 hover:shadow-emerald-500/20"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </form>
                                    </div>
                                </>
                            ) : (
                                <div className="hidden md:flex flex-col items-center justify-center h-full text-slate-300 p-8 text-center opacity-60">
                                    <img src="/brand-compact.png" alt="Logo" className="w-16 h-auto mb-6 grayscale opacity-20" />
                                    <h3 className="text-lg font-black text-slate-400 mb-2">Gestor de Mensajes</h3>
                                    <p className="max-w-xs text-sm">Selecciona un atleta de la lista para ver su historial de conversación y responder mensajes.</p>
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
