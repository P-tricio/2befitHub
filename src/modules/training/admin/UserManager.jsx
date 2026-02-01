import React, { useEffect, useState } from 'react';
import { Search, MoreVertical, Calendar, Activity, Trophy, MessageCircle, Trash2, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingDB } from '../services/db';
import UserTracking from './UserTracking';
import ChatDrawer from '../components/ChatDrawer';
import SendNotificationModal from './components/SendNotificationModal';
import { useNavigate, useLocation } from 'react-router-dom';

const UserManager = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State for actions
    const [selectedUser, setSelectedUser] = useState(null);
    const [initialTab, setInitialTab] = useState('metrics');
    const [activeMenuId, setActiveMenuId] = useState(null);
    const [chatUser, setChatUser] = useState(null);
    const [notificationUser, setNotificationUser] = useState(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

    // Listen for athleteId in URL
    useEffect(() => {
        if (users.length > 0) {
            const params = new URLSearchParams(location.search);
            const athleteId = params.get('athleteId');
            const targetTab = params.get('tab');
            if (athleteId) {
                const user = users.find(u => u.id === athleteId);
                if (user) {
                    setSelectedUser(user);
                    setInitialTab(targetTab || 'planning');
                    // Clear param to avoid re-opening on back/refresh
                    navigate(location.pathname, { replace: true });
                }
            }
        }
    }, [location.search, users]);

    const loadData = async () => {
        try {
            const usersData = await TrainingDB.users.getAll();
            setUsers(usersData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'inactive' ? 'active' : 'inactive';
        // Optimistic update
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));

        try {
            await TrainingDB.users.updateStatus(user.id, newStatus);
        } catch (error) {
            console.error(error);
            alert("Error al actualizar estado");
            loadData(); // Revert on error
        }
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar a ${user.displayName}? Esta acción no se puede deshacer.`)) {
            try {
                await TrainingDB.users.delete(user.id);
                setUsers(prev => prev.filter(u => u.id !== user.id));
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error al eliminar usuario');
            }
        }
    };

    const filteredUsers = users.filter(u =>
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedUser) {
        return (
            <UserTracking
                user={selectedUser}
                initialTab={initialTab}
                onClose={() => {
                    setSelectedUser(null);
                    setInitialTab('metrics');
                    loadData();
                }}
            />
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-slate-900 border-r-2 border-transparent" />
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto relative p-6">
                <header className="flex items-center gap-4 mb-4">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight shrink-0">Atletas</h1>
                    <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-full shrink-0">
                        {filteredUsers.length}
                    </span>
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-slate-900 transition-all"
                        />
                    </div>
                </header>

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/30">
                                <th className="p-6 pl-8">Atleta</th>
                                <th className="p-6">Estado</th>
                                <th className="p-6 text-right pr-8">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => setSelectedUser(user)}>
                                    <td className="p-6 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg overflow-hidden ring-2 ring-slate-100 shadow-sm shrink-0">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.displayName?.[0] || 'U'
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-900 text-base truncate">{user.displayName}</div>
                                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleStatus(user);
                                            }}
                                            className={`
                                            px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                                            ${user.status === 'inactive'
                                                    ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100'
                                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                                }
                                        `}
                                        >
                                            {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                        </button>
                                    </td>
                                    <td className="p-6 pr-8 text-right">
                                        <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setChatUser(user)}
                                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100/50"
                                                title="Abrir Chat"
                                            >
                                                <MessageCircle size={20} />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                                                    className={`p-2.5 rounded-xl transition-all border ${activeMenuId === user.id ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-110' : 'text-slate-400 hover:text-slate-900 border-transparent hover:border-slate-100 hover:bg-white'}`}
                                                >
                                                    <MoreVertical size={20} />
                                                </button>

                                                {/* Dropdown */}
                                                {activeMenuId === user.id && (
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200 text-left">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setInitialTab('planning');
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3"
                                                        >
                                                            <Calendar size={18} />
                                                            PLANIFICAR
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setInitialTab('metrics');
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3"
                                                        >
                                                            <Activity size={18} />
                                                            SEGUIMIENTO
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedUser(user);
                                                                setInitialTab('history');
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3"
                                                        >
                                                            <Trophy size={18} />
                                                            HISTORIAL
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setChatUser(user);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3 border-t border-slate-50"
                                                        >
                                                            <MessageCircle size={18} />
                                                            CHAT CON ATLETA
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setNotificationUser(user);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-3 border-t border-slate-50"
                                                        >
                                                            <Bell size={18} />
                                                            ENVIAR AVISO
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleDeleteUser(user);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-rose-500 hover:bg-rose-50 transition-all flex items-center gap-3 border-t border-slate-50"
                                                        >
                                                            <Trash2 size={18} />
                                                            ELIMINAR
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2">
                    {filteredUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm overflow-hidden shrink-0">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        user.displayName?.[0] || 'U'
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-slate-900 text-sm truncate">{user.displayName}</div>
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate">{user.email}</div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(user);
                                    }}
                                    className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wide border shrink-0 ${user.status === 'inactive'
                                        ? 'bg-rose-50 text-rose-500 border-rose-100'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }`}
                                >
                                    {user.status === 'inactive' ? 'Inact.' : 'Activo'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUser(user);
                                        setInitialTab('planning');
                                    }}
                                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5"
                                >
                                    <Calendar size={12} />
                                    Gestionar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setChatUser(user);
                                    }}
                                    className="p-2 bg-indigo-600 text-white rounded-lg"
                                >
                                    <MessageCircle size={16} />
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                        }}
                                        className={`p-2 border border-slate-100 rounded-lg transition-all ${activeMenuId === user.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                    {activeMenuId === user.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 py-1 z-20 text-left" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setInitialTab('metrics');
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 uppercase tracking-wide flex items-center gap-2"
                                            >
                                                <Activity size={12} />
                                                Seguimiento
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setInitialTab('history');
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50 uppercase tracking-wide flex items-center gap-2"
                                            >
                                                <Trophy size={12} />
                                                Historial
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNotificationUser(user);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10px] font-black text-indigo-600 hover:bg-slate-50 uppercase tracking-wide flex items-center gap-2 border-t border-slate-50"
                                            >
                                                <Bell size={12} />
                                                Enviar Aviso
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDeleteUser(user);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-3 py-2 text-[10px] font-black text-rose-500 hover:bg-rose-50 uppercase tracking-wide flex items-center gap-2 border-t border-slate-50"
                                            >
                                                <Trash2 size={12} />
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ChatDrawer
                isOpen={!!chatUser}
                onClose={() => setChatUser(null)}
                athleteId={chatUser?.id}
                athleteName={chatUser?.displayName}
                athletePhoto={chatUser?.photoURL}
                lastActiveAt={chatUser?.lastActiveAt}
                onNameClick={(id) => {
                    const user = users.find(u => u.id === id);
                    if (user) {
                        setSelectedUser(user);
                        setInitialTab('planning');
                        setChatUser(null);
                    }
                }}
            />

            <AnimatePresence>
                {notificationUser && (
                    <SendNotificationModal
                        user={notificationUser}
                        onClose={() => setNotificationUser(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default UserManager;
