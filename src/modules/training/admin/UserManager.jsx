import React, { useEffect, useState, useMemo } from 'react';
import { Search, MoreVertical, Calendar, Activity, Trophy, MessageCircle, Trash2, Bell, Filter, ArrowUpDown, ChevronDown, TrendingUp, TrendingDown, ClipboardList, X, Plus, CheckCircle2, Tag, RotateCcw } from 'lucide-react';
import CoachNotesView from '../components/CoachNotesView';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingDB } from '../services/db';
import UserTracking from './UserTracking';
import ChatDrawer from '../components/ChatDrawer';
import SendNotificationModal from './components/SendNotificationModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatDateSafely } from '../../../lib/dateUtils';

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
    const [notesUser, setNotesUser] = useState(null);
    const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('2befit_admin_status_filter') || 'active'); // 'active' | 'archived' | 'all'
    const [categoryFilter, setCategoryFilter] = useState(() => localStorage.getItem('2befit_admin_category_filter') || 'all'); // 'all' | 'online' | 'presencial'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    // Filtering and Sorting State
    const [sortConfig, setSortConfig] = useState(() => {
        const saved = localStorage.getItem('2befit_admin_sort_config');
        return saved ? JSON.parse(saved) : { key: 'displayName', direction: 'asc' };
    });
    const [isSortOpen, setIsSortOpen] = useState(false);

    // Persist filters and sort
    useEffect(() => {
        localStorage.setItem('2befit_admin_status_filter', statusFilter);
    }, [statusFilter]);

    useEffect(() => {
        localStorage.setItem('2befit_admin_category_filter', categoryFilter);
    }, [categoryFilter]);

    useEffect(() => {
        localStorage.setItem('2befit_admin_sort_config', JSON.stringify(sortConfig));
    }, [sortConfig]);

    // === WEEKLY REVIEW HELPERS ===
    const getWeekNumber = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return { year: d.getFullYear(), week: Math.round(((d - week1) / 86400000 + week1.getDay() + 6) / 7) };
    };

    const currentWeek = useMemo(() => getWeekNumber(new Date()), []);

    const isReviewedThisWeek = (user) => {
        if (!user.weeklyReviewedAt) return false;
        const reviewDate = user.weeklyReviewedAt?.toDate?.() || new Date(user.weeklyReviewedAt);
        const reviewWeek = getWeekNumber(reviewDate);
        return reviewWeek.year === currentWeek.year && reviewWeek.week === currentWeek.week;
    };

    const isUserOnline = (user) => {
        if (!user.lastActiveAt) return false;
        const lastActive = user.lastActiveAt?.toDate?.() || new Date(user.lastActiveAt);
        const diffMs = new Date() - lastActive;
        const diffMins = diffMs / (1000 * 60);
        return diffMins < 10; // Online if active in last 10 minutes
    };

    const toggleReview = async (userId) => {
        const user = users.find(u => u.id === userId);
        const isReviewed = isReviewedThisWeek(user);
        try {
            await TrainingDB.users.updateProfile(userId, {
                weeklyReviewedAt: isReviewed ? null : new Date()
            });
            setUsers(prev => prev.map(u => u.id === userId
                ? { ...u, weeklyReviewedAt: isReviewed ? null : new Date() }
                : u
            ));
        } catch (e) {
            console.error('Error toggling review:', e);
        }
    };

    const resetAllReviews = async () => {
        if (!window.confirm('¿Resetear todas las revisiones de esta semana?')) return;
        try {
            const activeUsers = users.filter(u => u.status !== 'archived');
            await Promise.all(activeUsers.map(u =>
                TrainingDB.users.updateProfile(u.id, { weeklyReviewedAt: null })
            ));
            setUsers(prev => prev.map(u => ({ ...u, weeklyReviewedAt: null })));
        } catch (e) {
            console.error('Error resetting reviews:', e);
        }
    };

    const setUserTag = async (userId, tag) => {
        try {
            const tags = tag ? [tag] : [];
            await TrainingDB.users.updateProfile(userId, { tags });
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, tags } : u));
            setActiveMenuId(null);
        } catch (e) {
            console.error('Error setting tag:', e);
        }
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setActiveMenuId(null);
            setIsSortOpen(false);
            setIsFilterOpen(false);
            setIsCategoryOpen(false);
        };
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

    const getSortLabel = () => {
        switch (sortConfig.key) {
            case 'lastActiveAt': return 'Últ. Conexión';
            case 'createdAt': return 'Ingreso';
            default: return '';
        }
    };

    const formatSortValue = (user) => {
        const val = user[sortConfig.key];
        if (!val && sortConfig.key !== 'status') return '—';

        if (sortConfig.key === 'displayName') return '';

        const dateFields = ['lastMessageAt', 'lastActiveAt', 'createdAt', 'updatedAt'];
        if (dateFields.includes(sortConfig.key)) {
            return formatDateSafely(val, {
                day: '2-digit',
                month: 'short',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return val?.toString() || '—';
    };


    const handleArchiveUser = async (user) => {
        if (!window.confirm(`¿Estás seguro de que quieres archivar a ${user.displayName}? No podrá acceder a su plan hasta que lo desarchives.`)) return;
        try {
            await TrainingDB.users.archive(user.id);
            loadData();
            setActiveMenuId(null);
        } catch (error) {
            console.error('Error archiving user:', error);
            alert('Error al archivar usuario');
        }
    };

    const handleUnarchiveUser = async (user) => {
        try {
            await TrainingDB.users.unarchive(user.id);
            loadData();
            setActiveMenuId(null);
        } catch (error) {
            console.error('Error unarchiving user:', error);
            alert('Error al desarchivar usuario');
        }
    };

    const filteredUsers = users.filter(user => {
        // Status Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'active' && user.status === 'archived') return false;
            if (statusFilter === 'archived' && user.status !== 'archived') return false;
        }

        // Category Filter
        if (categoryFilter !== 'all') {
            const userTag = user.tags?.[0] || 'online';
            if (userTag !== categoryFilter) return false;
        }

        // Search Term Filter
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (user.displayName || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (user.email || '').toLowerCase().includes(lowerCaseSearchTerm);
    })
        .sort((a, b) => {
            // Primary sort: unreviewed first
            const aReviewed = isReviewedThisWeek(a) ? 1 : 0;
            const bReviewed = isReviewedThisWeek(b) ? 1 : 0;
            if (aReviewed !== bReviewed) return aReviewed - bReviewed;

            // Secondary sort: user-selected
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            // Normalize for comparison
            const dateFields = ['lastMessageAt', 'lastActiveAt', 'createdAt', 'updatedAt'];
            if (dateFields.includes(sortConfig.key)) {
                valA = valA?.toDate?.()?.getTime() || (valA ? new Date(valA).getTime() : 0);
                valB = valB?.toDate?.()?.getTime() || (valB ? new Date(valB).getTime() : 0);
            } else {
                valA = valA || '';
                valB = valB || '';
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

    // Review stats - now dynamic based on filtered results (but still focused on non-archived)
    const activeClientsList = filteredUsers.filter(u => u.status !== 'archived');
    const reviewedCount = activeClientsList.filter(u => isReviewedThisWeek(u)).length;
    const totalActiveCount = activeClientsList.length;
    const reviewProgress = totalActiveCount > 0 ? (reviewedCount / totalActiveCount) * 100 : 0;

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
                <header className="flex flex-col gap-4 mb-6">
                    {/* Top Row: Title & Count */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Atletas</h1>
                            <span className="bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                                {filteredUsers.length}
                            </span>
                        </div>
                        {/* Optional Action Button could go here */}
                    </div>

                    {/* Search Row: Full width search */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[11px] font-bold uppercase tracking-widest outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all shadow-sm"
                        />
                    </div>

                    {/* Filters & Sort Distribution: Grid on mobile, flex on desktop */}
                    <div className="grid grid-cols-2 md:flex md:items-center gap-2">
                        {/* Category Filter */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCategoryOpen(!isCategoryOpen);
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${categoryFilter !== 'all'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'bg-white text-slate-500 border border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Tag size={14} className="shrink-0" />
                                    <span className="truncate">{categoryFilter === 'all' ? 'Categoría' : categoryFilter}</span>
                                </div>
                                <ChevronDown size={14} className={`transition-transform shrink-0 ${isCategoryOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isCategoryOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute left-0 mt-2 w-48 bg-slate-900 text-white rounded-2xl shadow-2xl py-2 z-[60] border border-white/10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => { setCategoryFilter('all'); setIsCategoryOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Todas</button>
                                        <button onClick={() => { setCategoryFilter('online'); setIsCategoryOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Online</button>
                                        <button onClick={() => { setCategoryFilter('presencial'); setIsCategoryOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Presencial</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFilterOpen(!isFilterOpen);
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${statusFilter !== 'active'
                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-100'
                                    : 'bg-white text-slate-500 border border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <Activity size={14} className="shrink-0" />
                                    <span className="truncate">{statusFilter === 'active' ? 'Activos' : statusFilter}</span>
                                </div>
                                <ChevronDown size={14} className={`transition-transform shrink-0 ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isFilterOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 md:left-0 mt-2 w-48 bg-slate-900 text-white rounded-2xl shadow-2xl py-2 z-[60] border border-white/10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => { setStatusFilter('active'); setIsFilterOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Activos</button>
                                        <button onClick={() => { setStatusFilter('archived'); setIsFilterOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Archivados</button>
                                        <button onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }} className="w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Todos</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sort Button */}
                        <div className="relative col-span-1 md:shrink-0">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSortOpen(!isSortOpen);
                                }}
                                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <ArrowUpDown size={14} className="text-slate-400 shrink-0" />
                                    <span className="truncate">ORDENAR</span>
                                </div>
                                <ChevronDown size={14} className={`transition-transform shrink-0 ${isSortOpen ? 'rotate-180' : ''}`} />
                            </button>
                            <AnimatePresence>
                                {isSortOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute left-0 mt-2 w-48 bg-slate-900 text-white rounded-2xl shadow-2xl py-2 z-[60] border border-white/10"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button onClick={() => { setSortConfig({ key: 'displayName', direction: 'asc' }); setIsSortOpen(false); }} className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 ${sortConfig.key === 'displayName' ? 'text-indigo-400' : ''}`}>Nombre</button>
                                        <button onClick={() => { setSortConfig({ key: 'lastActiveAt', direction: 'desc' }); setIsSortOpen(false); }} className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 ${sortConfig.key === 'lastActiveAt' ? 'text-indigo-400' : ''}`}>Última Conexión</button>
                                        <button onClick={() => { setSortConfig({ key: 'createdAt', direction: 'desc' }); setIsSortOpen(false); }} className={`w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 ${sortConfig.key === 'createdAt' ? 'text-indigo-400' : ''}`}>Fecha Ingreso</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Direction Toggle */}
                        <div className="col-span-1 flex">
                            <button
                                onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                className="flex-1 flex items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all active:scale-95 shrink-0"
                            >
                                {sortConfig.direction === 'asc' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                <span className="ml-2 text-[10px] font-black md:hidden uppercase tracking-widest">
                                    {sortConfig.direction === 'asc' ? 'ASC' : 'DESC'}
                                </span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Review Progress */}
                {statusFilter !== 'archived' && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
                        {/* Progress */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2 shrink-0">
                                <CheckCircle2 size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Revisados: {reviewedCount}/{totalActiveCount}
                                </span>
                            </div>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[80px] max-w-[200px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${reviewProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${reviewProgress}%` }}
                                />
                            </div>
                            {reviewedCount > 0 && (
                                <button
                                    onClick={resetAllReviews}
                                    className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all shrink-0"
                                    title="Resetear revisiones"
                                >
                                    <RotateCcw size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden md:block bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50/30">
                                <th className="p-6 pl-4 w-10"></th>
                                <th className="p-6 pl-2">Atleta</th>
                                {getSortLabel() && (
                                    <th className="p-6 text-slate-400">{getSortLabel()}</th>
                                )}
                                <th className="p-6 text-right pr-8">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className={`group hover:bg-slate-50/50 transition-all cursor-pointer ${isReviewedThisWeek(user) ? 'opacity-50' : ''}`} onClick={() => setSelectedUser(user)}>
                                    {/* Review Checkbox */}
                                    <td className="p-6 pl-4 w-10" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => toggleReview(user.id)}
                                            className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all active:scale-90 ${isReviewedThisWeek(user)
                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                                                : 'border-slate-200 text-transparent hover:border-slate-400 hover:text-slate-300'
                                                }`}
                                            title={isReviewedThisWeek(user) ? 'Marcar como no revisado' : 'Marcar como revisado'}
                                        >
                                            <CheckCircle2 size={16} />
                                        </button>
                                    </td>
                                    <td className="p-6 pl-2">
                                        <div className="flex items-center gap-4">
                                            <div className="relative w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black overflow-hidden shrink-0">
                                                {user.photoURL ? (
                                                    <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                                ) : (
                                                    user.displayName?.[0] || 'U'
                                                )}
                                                {isUserOnline(user) && (
                                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 truncate">
                                                        {user.displayName}
                                                    </span>
                                                    {isUserOnline(user) && (
                                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                    )}
                                                    {user.status === 'archived' && (
                                                        <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Archivado</span>
                                                    )}
                                                    {user.tags?.[0] && (
                                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${user.tags[0] === 'online' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'
                                                            }`}>
                                                            {user.tags[0]}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-widest leading-none">
                                                    {user.email || 'Sin email'}
                                                </span>
                                            </div>
                                        </div>
                                        {user.coachNotes && user.coachNotes.length > 0 && (
                                            <div className="mt-1 flex items-center gap-1.5 text-indigo-500/80">
                                                <ClipboardList size={10} className="shrink-0" />
                                                <span className="text-[9px] font-bold truncate max-w-[200px]">
                                                    {user.coachNotes[0].text}
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    {getSortLabel() && (
                                        <td className="p-6">
                                            <span className="bg-slate-50 text-slate-600 border border-slate-100 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all">
                                                {formatSortValue(user)}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-6 pr-8 text-right">
                                        <div className="flex justify-end items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => setChatUser(user)}
                                                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100/50"
                                                title="Abrir Chat"
                                            >
                                                <MessageCircle size={20} />
                                            </button>
                                            <button
                                                onClick={() => setNotesUser(user)}
                                                className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-100/50"
                                                title="Ver Notas"
                                            >
                                                <ClipboardList size={20} />
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
                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200 text-left">
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
                                                                setNotificationUser(user);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-sm font-black text-indigo-600 hover:bg-slate-50 transition-all flex items-center gap-3 border-t border-slate-100"
                                                        >
                                                            <Bell size={18} />
                                                            ENVIAR AVISO
                                                        </button>
                                                        {/* Tag Assignment */}
                                                        <div className="border-t border-slate-100 py-1">
                                                            <span className="px-4 py-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">Categoría</span>
                                                            <button onClick={() => setUserTag(user.id, 'online')} className={`w-full text-left px-4 py-2 text-[10px] font-black hover:bg-slate-50 flex items-center gap-2 ${(user.tags?.[0]) === 'online' ? 'text-sky-600' : 'text-slate-500'}`}>
                                                                <Tag size={12} /> Online {(user.tags?.[0]) === 'online' && String.fromCharCode(10003)}
                                                            </button>
                                                            <button onClick={() => setUserTag(user.id, 'presencial')} className={`w-full text-left px-4 py-2 text-[10px] font-black hover:bg-slate-50 flex items-center gap-2 ${(user.tags?.[0]) === 'presencial' ? 'text-orange-600' : 'text-slate-500'}`}>
                                                                <Tag size={12} /> Presencial {(user.tags?.[0]) === 'presencial' && String.fromCharCode(10003)}
                                                            </button>
                                                            <button onClick={() => setUserTag(user.id, null)} className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-400 hover:bg-slate-50 flex items-center gap-2">
                                                                <X size={12} /> Sin etiqueta
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => user.status === 'archived' ? handleUnarchiveUser(user) : handleArchiveUser(user)}
                                                            className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-600 hover:bg-slate-50 uppercase tracking-widest flex items-center gap-3 border-t border-slate-100"
                                                        >
                                                            <Calendar size={14} />
                                                            {user.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user)}
                                                            className="w-full text-left px-4 py-3 text-[10px] font-black text-rose-500 hover:bg-rose-50 uppercase tracking-widest flex items-center gap-3 border-t border-slate-100"
                                                        >
                                                            <Trash2 size={14} />
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

                {/* Mobile Athlete List */}
                <div className="md:hidden space-y-4 pb-20">
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.map(user => (
                            <motion.div
                                layout
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className={`bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm transition-all ${isReviewedThisWeek(user) ? 'opacity-50' : ''}`}
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                                            ) : (
                                                user.displayName?.[0] || 'U'
                                            )}
                                            {isUserOnline(user) && (
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h3 className="font-black text-slate-900 truncate">{user.displayName}</h3>
                                                {isUserOnline(user) && (
                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                )}
                                                {user.status === 'archived' && (
                                                    <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Archivado</span>
                                                )}
                                                {user.tags?.[0] && (
                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${user.tags[0] === 'online' ? 'bg-sky-50 text-sky-500' : 'bg-orange-50 text-orange-500'
                                                        }`}>
                                                        {user.tags[0]}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{user.email || 'Sin email'}</p>
                                        </div>
                                    </div>

                                    {/* Review Toggle Mobile */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleReview(user.id);
                                        }}
                                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${isReviewedThisWeek(user)
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : 'border-slate-100 text-slate-200'
                                            }`}
                                    >
                                        <CheckCircle2 size={20} />
                                    </button>
                                </div>

                                {/* Mobile Extra Info (Notes/Sort) */}
                                <div className="mt-3 space-y-2">
                                    {user.coachNotes && user.coachNotes.length > 0 && (
                                        <div className="flex items-center gap-1 text-indigo-500/70">
                                            <ClipboardList size={10} className="shrink-0" />
                                            <span className="text-[9px] font-bold truncate italic">
                                                &quot;{user.coachNotes[0].text}&quot;
                                            </span>
                                        </div>
                                    )}
                                    {getSortLabel() && (
                                        <div className="text-[8px] font-black text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded-md w-fit">
                                            {getSortLabel()}: {formatSortValue(user)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-50">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedUser(user);
                                            setInitialTab('planning');
                                        }}
                                        className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <Calendar size={14} />
                                        Gestionar
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChatUser(user);
                                        }}
                                        className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100"
                                    >
                                        <MessageCircle size={20} />
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuId(activeMenuId === user.id ? null : user.id);
                                            }}
                                            className={`p-2.5 rounded-xl border transition-all ${activeMenuId === user.id ? 'bg-slate-100 border-slate-200 text-slate-900' : 'bg-white border-slate-100 text-slate-400'}`}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {/* Mobile Extra Actions Menu */}
                                        <AnimatePresence>
                                            {activeMenuId === user.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                    className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 overflow-hidden"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button onClick={() => { setSelectedUser(user); setInitialTab('metrics'); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3">
                                                        <Activity size={14} /> Seguimiento
                                                    </button>
                                                    <button onClick={() => { setSelectedUser(user); setInitialTab('history'); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3">
                                                        <Trophy size={14} /> Historial
                                                    </button>
                                                    <button onClick={() => { setNotificationUser(user); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50">
                                                        <Bell size={14} /> Enviar Aviso
                                                    </button>
                                                    {/* Category change for mobile menu */}
                                                    <div className="border-t border-slate-50 py-1">
                                                        <div className="px-4 py-1 text-[8px] font-black text-slate-300 uppercase tracking-widest">Categoría</div>
                                                        <button onClick={() => { setUserTag(user.id, 'online'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-50 flex items-center gap-3">
                                                            <Tag size={12} className="text-sky-400" /> Online
                                                        </button>
                                                        <button onClick={() => { setUserTag(user.id, 'presencial'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-500 hover:bg-slate-50 flex items-center gap-3">
                                                            <Tag size={12} className="text-orange-400" /> Presencial
                                                        </button>
                                                    </div>
                                                    <button onClick={() => { user.status === 'archived' ? handleUnarchiveUser(user) : handleArchiveUser(user); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3 border-t border-slate-50">
                                                        <Calendar size={14} /> {user.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                                                    </button>
                                                    <button onClick={() => { handleDeleteUser(user); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 flex items-center gap-3 border-t border-slate-50">
                                                        <Trash2 size={14} /> Eliminar
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div >

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
                {notesUser && (
                    <QuickNotesModal
                        user={notesUser}
                        onClose={() => {
                            setNotesUser(null);
                            loadData(); // Refresh to catch any updates in the main list if needed
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

const QuickNotesModal = ({ user, onClose }) => {
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-slate-50 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg overflow-hidden shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                            ) : (
                                user.displayName?.[0] || 'U'
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">{user.displayName}</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas del Coach</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <CoachNotesView
                        user={user}
                        onUpdate={(updatedUser) => {
                            // The updates are persisted to Firestore in CoachNotesView.
                            // We don't necessarily NEED to update local state here as the modal is self-contained,
                            // but if UserManager had a way to update its list, we'd call it.
                        }}
                    />
                </div>

                {/* Footer / Hint */}
                <div className="p-4 bg-white border-t border-slate-100 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Los cambios se guardan automáticamente en la ficha del atleta
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default UserManager;
