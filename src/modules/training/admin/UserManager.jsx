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
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Atletas</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Gestión centralizada de miembros y planificación.</p>
                    </div>

                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
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
                <div className="md:hidden space-y-4">
                    {filteredUsers.map(user => (
                        <div
                            key={user.id}
                            onClick={() => setSelectedUser(user)}
                            className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm active:scale-[0.97] transition-all"
                        >
                            <div className="flex justify-between items-center mb-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl overflow-hidden shadow-lg shadow-slate-900/10 shrink-0">
                                        {user.photoURL ? (
                                            <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            user.displayName?.[0] || 'U'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-black text-slate-900 text-base truncate">{user.displayName}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate max-w-[150px]">{user.email}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleStatus(user);
                                    }}
                                    className={`
                                px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                                ${user.status === 'inactive'
                                            ? 'bg-rose-50 text-rose-500 border-rose-100'
                                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        }
                            `}
                                >
                                    {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                </button>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-50">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUser(user);
                                        setInitialTab('planning');
                                    }}
                                    className="flex-1 bg-slate-900 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                                >
                                    <Calendar size={16} />
                                    Gestionar
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setChatUser(user);
                                    }}
                                    className="p-3 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                                >
                                    <MessageCircle size={20} />
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                        }}
                                        className={`p-3 border border-slate-100 rounded-2xl transition-all ${activeMenuId === user.id ? 'bg-slate-100 text-slate-900 border-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <MoreVertical size={20} />
                                    </button>
                                    {activeMenuId === user.id && (
                                        <div className="absolute right-0 bottom-full mb-3 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 text-left animate-in fade-in slide-in-from-bottom-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setInitialTab('metrics');
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest flex items-center gap-3"
                                            >
                                                <Activity size={16} />
                                                Seguimiento
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setInitialTab('history');
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest flex items-center gap-3"
                                            >
                                                <Trophy size={16} />
                                                Historial
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setChatUser(user);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 transition-colors uppercase tracking-widest flex items-center gap-3 border-t border-slate-50"
                                            >
                                                <MessageCircle size={16} />
                                                Chat Directo
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setNotificationUser(user);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-black text-indigo-600 hover:bg-slate-50 transition-colors uppercase tracking-widest flex items-center gap-3 border-t border-slate-50"
                                            >
                                                <Bell size={16} />
                                                Enviar Aviso
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleDeleteUser(user);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-3 text-xs font-black text-rose-500 hover:bg-rose-50 transition-colors uppercase tracking-widest flex items-center gap-3 border-t border-slate-50"
                                            >
                                                <Trash2 size={16} />
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
