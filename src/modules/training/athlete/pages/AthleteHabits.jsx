import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Utensils, Footprints, Heart, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, Target, Plus } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';

const CATEGORIES = [
    { id: 'nutrition', label: 'Nutrición', icon: <Utensils size={18} />, color: 'orange' },
    { id: 'movement', label: 'Movimiento', icon: <Footprints size={18} />, color: 'emerald' },
    { id: 'health', label: 'Salud', icon: <Heart size={18} />, color: 'rose' },
];

const AthleteHabits = ({ userId, isAdminView = false }) => {
    const { currentUser: authUser } = useAuth();
    const currentUserId = userId || authUser?.uid;
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [userProfile, setUserProfile] = useState(null);
    const [monthlyData, setMonthlyData] = useState({});
    const [loading, setLoading] = useState(true);
    const [newHabit, setNewHabit] = useState('');
    const [showAddHabit, setShowAddHabit] = useState(false);
    const [activeFilters, setActiveFilters] = useState(['nutrition', 'movement', 'health', 'uncategorized']);

    useEffect(() => {
        if (!currentUserId) return;
        loadData();
    }, [currentUserId, viewDate]);

    const loadData = async () => {
        try {
            // Fetch User Profile for Categorized Minimums
            const profile = await TrainingDB.users.getById(currentUserId);
            setUserProfile(profile);

            // Fetch History for the visible month
            const start = startOfMonth(viewDate);
            const end = endOfMonth(viewDate);
            const history = await TrainingDB.tracking.getHistory(currentUserId, 62);

            const dataMap = {};
            history.forEach(entry => {
                dataMap[entry.date] = entry;
            });
            setMonthlyData(dataMap);
        } catch (error) {
            console.error("Error loading habits data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSetStatus = async (habitName, date, targetStatus) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const entry = monthlyData[dateKey] || { date: dateKey, habitsResults: {} };
        const currentStatus = entry.habitsResults?.[habitName];

        // Toggle off if clicking the same status
        const nextStatus = currentStatus === targetStatus ? null : targetStatus;

        const updatedResults = { ...(entry.habitsResults || {}), [habitName]: nextStatus };

        // Optimistic Update
        setMonthlyData(prev => ({
            ...prev,
            [dateKey]: { ...entry, habitsResults: updatedResults }
        }));

        try {
            await TrainingDB.tracking.addEntry(currentUserId, {
                date: dateKey,
                habitsResults: updatedResults
            });
        } catch (error) {
            console.error("Error updating habit:", error);
            // Revert on error
            loadData();
        }
    };

    const handleAddHabit = async () => {
        if (!newHabit.trim()) return;

        const currentMinimums = userProfile?.minimums || {};
        const uncategorized = currentMinimums.uncategorized || [];

        if (uncategorized.includes(newHabit.trim())) return;

        const updatedMinimums = {
            ...currentMinimums,
            uncategorized: [...uncategorized, newHabit.trim()]
        };

        setUserProfile(prev => ({ ...prev, minimums: updatedMinimums }));
        setNewHabit('');
        setShowAddHabit(false);

        try {
            await TrainingDB.users.updateProfile(currentUserId, { minimums: updatedMinimums });
        } catch (error) {
            console.error("Error adding habit:", error);
            loadData();
        }
    };

    const getDayStatus = (date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const entry = monthlyData[dateKey];
        if (!entry || !entry.habitsResults) return 'pending';

        const results = entry.habitsResults;
        const habits = getFilteredMinimums();

        if (habits.length === 0) return 'pending';

        const activeResults = habits.filter(h => results[h] !== undefined && results[h] !== null);
        if (activeResults.length === 0) return 'pending';

        const failed = habits.some(h => results[h] === false);
        if (failed) return 'fail';

        const allDone = habits.every(h => results[h] === true);
        if (allDone) return 'success';

        return 'partial';
    };

    const getAllMinimums = () => {
        if (!userProfile?.minimums) return [];
        const m = userProfile.minimums;
        if (Array.isArray(m)) return m;
        return [
            ...(m.nutrition || []),
            ...(m.movement || []),
            ...(m.health || []),
            ...(m.uncategorized || [])
        ];
    };

    const getFilteredMinimums = () => {
        if (!userProfile?.minimums) return [];
        const m = userProfile.minimums;
        if (Array.isArray(m)) return activeFilters.includes('nutrition') ? m : [];

        let filtered = [];
        if (activeFilters.includes('nutrition')) filtered = [...filtered, ...(m.nutrition || [])];
        if (activeFilters.includes('movement')) filtered = [...filtered, ...(m.movement || [])];
        if (activeFilters.includes('health')) filtered = [...filtered, ...(m.health || [])];
        if (activeFilters.includes('uncategorized')) filtered = [...filtered, ...(m.uncategorized || [])];
        return filtered;
    };

    const toggleFilter = (catId) => {
        setActiveFilters(prev =>
            prev.includes(catId)
                ? prev.filter(c => c !== catId)
                : [...prev, catId]
        );
    };

    const getMinimumsByCategory = (catId) => {
        if (!userProfile?.minimums) return [];
        const m = userProfile.minimums;
        if (Array.isArray(m)) {
            return catId === 'nutrition' ? m : []; // Legacy mapping
        }
        return m[catId] || [];
    };

    const renderCalendar = () => {
        const start = startOfMonth(viewDate);
        const end = endOfMonth(viewDate);
        const days = eachDayOfInterval({ start, end });

        const firstDayIdx = start.getDay(); // 0 is Sunday
        const padCount = firstDayIdx === 0 ? 6 : firstDayIdx - 1; // Mon-Sun
        const padding = Array(padCount).fill(null);

        return (
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
                <div className="grid grid-cols-7 mb-4 text-center">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-[10px] font-black text-slate-300 py-2">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {[...padding, ...days].map((date, idx) => {
                        if (!date) return <div key={`pad-${idx}`} className="h-10" />;

                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const status = getDayStatus(date);

                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={`relative h-10 w-full flex items-center justify-center rounded-2xl text-sm font-bold transition-all
                                    ${isSelected ? 'scale-110 z-10 shadow-md ring-2 ring-slate-900' : 'hover:bg-slate-50'}
                                    ${status === 'success' ? 'bg-emerald-500 text-white' :
                                        status === 'fail' ? 'bg-rose-500 text-white' :
                                            status === 'partial' ? 'bg-amber-400 text-white' :
                                                'bg-slate-50 text-slate-400'}
                                    ${isToday && !isSelected ? 'ring-1 ring-slate-200' : ''}
                                `}
                            >
                                {format(date, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const selectedEntry = monthlyData[format(selectedDate, 'yyyy-MM-dd')] || { habitsResults: {} };

    return (
        <div className="p-6 max-w-lg mx-auto space-y-8 pb-32">
            <header className="space-y-4">
                <div className="flex justify-between items-center text-left">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mis Hábitos</h1>
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Cumplimiento y Mínimos</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-xs font-black uppercase text-slate-900 min-w-[100px] text-center">
                            {format(viewDate, 'MMMM yyyy', { locale: es })}
                        </span>
                        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => toggleFilter(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-xs font-black ${activeFilters.includes(cat.id) ? `bg-${cat.color}-500 text-white border-${cat.color}-500 shadow-lg shadow-${cat.color}-500/20` : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            {activeFilters.includes(cat.id) ? <Check size={14} strokeWidth={4} /> : React.cloneElement(cat.icon, { size: 14 })}
                            {cat.label}
                        </button>
                    ))}
                    <button
                        onClick={() => toggleFilter('uncategorized')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all text-xs font-black ${activeFilters.includes('uncategorized') ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                        {activeFilters.includes('uncategorized') ? <Check size={14} strokeWidth={4} /> : <Target size={14} />}
                        Próximos
                    </button>
                </div>
            </header>

            {renderCalendar()}

            <section className="space-y-6">
                <div className="flex justify-between items-end px-2">
                    <h2 className="text-xl font-black text-slate-900 capitalize">
                        {isSameDay(selectedDate, new Date()) ? 'Hoy' : format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                    </h2>
                    <button
                        onClick={() => setShowAddHabit(true)}
                        className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center gap-1"
                    >
                        <Plus size={14} /> Añadir Mínimo
                    </button>
                </div>

                <div className="space-y-8">
                    {CATEGORIES.map(cat => (
                        <div key={cat.id} className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className={`p-2 bg-${cat.color}-50 text-${cat.color}-500 rounded-xl`}>
                                    {cat.icon}
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{cat.label}</h3>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                {getMinimumsByCategory(cat.id).length === 0 ? (
                                    <div className="px-4 py-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-100 text-center">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin mínimos en esta categoría</p>
                                    </div>
                                ) : (
                                    getMinimumsByCategory(cat.id).map(habit => {
                                        const status = selectedEntry.habitsResults?.[habit];
                                        return (
                                            <div
                                                key={habit}
                                                className={`flex items-center justify-between p-4 rounded-3xl border transition-all
                                                    ${status === true ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' :
                                                        status === false ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm' :
                                                            'bg-white border-slate-100 text-slate-600'}
                                                `}
                                            >
                                                <span className="font-black text-sm flex-1">{habit}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleSetStatus(habit, selectedDate, false)}
                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                                            ${status === false ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-400'}
                                                        `}
                                                    >
                                                        <X size={18} strokeWidth={4} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSetStatus(habit, selectedDate, true)}
                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                                            ${status === true ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-50 text-slate-300 hover:bg-emerald-50 hover:text-emerald-400'}
                                                        `}
                                                    >
                                                        <Check size={18} strokeWidth={4} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Uncategorized Habits */}
                    {getMinimumsByCategory('uncategorized').length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-2">
                                <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                                    <Target size={18} />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Pendientes de organizar</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                {getMinimumsByCategory('uncategorized').map(habit => {
                                    const status = selectedEntry.habitsResults?.[habit];
                                    return (
                                        <div
                                            key={habit}
                                            className={`flex items-center justify-between p-4 rounded-3xl border transition-all
                                                ${status === true ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                                                    status === false ? 'bg-rose-50 border-rose-200 text-rose-900' :
                                                        'bg-white border-slate-100 text-slate-600'}
                                            `}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="font-black text-sm block truncate">{habit}</span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Pendiente de organizar</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => handleSetStatus(habit, selectedDate, false)}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                                        ${status === false ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-rose-400'}
                                                    `}
                                                >
                                                    <X size={18} strokeWidth={4} />
                                                </button>
                                                <button
                                                    onClick={() => handleSetStatus(habit, selectedDate, true)}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95
                                                        ${status === true ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-emerald-400'}
                                                    `}
                                                >
                                                    <Check size={18} strokeWidth={4} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Add Habit Modal */}
            <AnimatePresence>
                {showAddHabit && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setShowAddHabit(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl z-[110] p-8"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-900">Añadir Mínimo</h3>
                                <button onClick={() => setShowAddHabit(false)} className="p-2 hover:bg-slate-50 rounded-full">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                                Define un hábito que consideres innegociable. Tu coach lo organizará posteriormente en la categoría correspondiente.
                            </p>
                            <div className="space-y-6">
                                <input
                                    type="text"
                                    placeholder="Ej: Caminar 20 min"
                                    value={newHabit}
                                    onChange={(e) => setNewHabit(e.target.value)}
                                    className="w-full text-2xl font-black text-slate-900 bg-transparent border-b-4 border-slate-50 focus:border-slate-900 outline-none pb-4 placeholder:text-slate-100"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAddHabit}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
                                >
                                    <Check size={20} strokeWidth={4} />
                                    CONFIRMAR MÍNIMO
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AthleteHabits;
