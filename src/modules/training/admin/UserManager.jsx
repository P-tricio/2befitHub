import React, { useEffect, useState } from 'react';
import { Search, User, Calendar, MoreVertical, Shield, ShieldOff, CalendarDays } from 'lucide-react';
import { TrainingDB } from '../services/db';
import UserPlanning from './UserPlanning';
import UserTracking from './UserTracking';
import UserSessionHistory from './UserSessionHistory';

const UserManager = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State for actions
    const [planningUser, setPlanningUser] = useState(null);
    const [trackingUser, setTrackingUser] = useState(null);
    const [historyUser, setHistoryUser] = useState(null);
    const [activeMenuId, setActiveMenuId] = useState(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        loadData();
    }, []);

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

    const filteredUsers = users.filter(u =>
        (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (planningUser) {
        return (
            <UserPlanning
                user={planningUser}
                onClose={() => {
                    setPlanningUser(null);
                    loadData();
                }}
            />
        );
    }

    if (historyUser) {
        return (
            <UserSessionHistory
                user={historyUser}
                onClose={() => setHistoryUser(null)}
            />
        );
    }

    return (
        <div className="max-w-5xl mx-auto relative p-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900">Usuarios</h1>
                    <p className="text-slate-500 text-sm">Gestiona el acceso y la planificación de los atletas.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-900 transition-colors"
                    />
                </div>
            </header>

            {/* Desktop Table View (Hidden on mobile) */}
            <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <th className="p-4 pl-6">Atleta</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right pr-6">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                            {user.displayName?.[0] || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{user.displayName}</div>
                                            <div className="text-xs text-slate-500">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => handleToggleStatus(user)}
                                        className={`
                                            px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all
                                            ${user.status === 'inactive'
                                                ? 'bg-red-50 text-red-500 border-red-100 hover:bg-red-100'
                                                : 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100'
                                            }
                                        `}
                                    >
                                        {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                                    </button>
                                </td>
                                <td className="p-4 pr-6">
                                    <div className="flex justify-end items-center gap-2">
                                        <button
                                            onClick={() => setPlanningUser(user)}
                                            className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                                        >
                                            <CalendarDays size={14} />
                                            Planificar
                                        </button>

                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${activeMenuId === user.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:bg-slate-100'}`}
                                            >
                                                <MoreVertical size={16} />
                                            </button>

                                            {/* Dropdown */}
                                            {activeMenuId === user.id && (
                                                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={() => setTrackingUser(user)}
                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                                    >
                                                        Ver Información / Seguimiento
                                                    </button>
                                                    <button
                                                        onClick={() => setHistoryUser(user)}
                                                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                                    >
                                                        Historial
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr>
                                <td colSpan="3" className="p-8 text-center text-slate-400 text-sm italic">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View (Visible only on small screens) */}
            <div className="md:hidden space-y-3">
                {filteredUsers.map(user => (
                    <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                                    {user.displayName?.[0] || 'U'}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-slate-900 text-sm truncate">{user.displayName}</div>
                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggleStatus(user)}
                                className={`
                                    px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all
                                    ${user.status === 'inactive'
                                        ? 'bg-red-50 text-red-500 border-red-100'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                    }
                                `}
                            >
                                {user.status === 'inactive' ? 'Inactivo' : 'Activo'}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                            <button
                                onClick={() => setPlanningUser(user)}
                                className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <CalendarDays size={14} />
                                Planificar
                            </button>
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                    }}
                                    className={`p-2 border border-slate-100 rounded-lg transition-colors ${activeMenuId === user.id ? 'bg-slate-100 text-slate-900 border-slate-200' : 'text-slate-400 hover:bg-slate-50'}`}
                                >
                                    <MoreVertical size={16} />
                                </button>
                                {activeMenuId === user.id && (
                                    <div className="absolute right-0 bottom-full mb-2 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 text-left animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            onClick={() => setTrackingUser(user)}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            Ver Información / Seguimiento
                                        </button>
                                        <button
                                            onClick={() => setHistoryUser(user)}
                                            className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                            Historial
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-sm italic">
                        No se encontraron usuarios.
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManager;
