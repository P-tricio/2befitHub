import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, startOfWeek, endOfWeek, addDays, isAfter, startOfDay, getDay, isSameMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Utensils, Footprints, Heart, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, Target, Plus } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';

const CATEGORIES = [
    { id: 'nutrition', label: 'Nutrición', shortLabel: 'Nutr.', icon: <Utensils size={14} />, color: 'orange' },
    { id: 'movement', label: 'Movimiento', shortLabel: 'Mov.', icon: <Footprints size={14} />, color: 'emerald' },
    { id: 'health', label: 'Salud', shortLabel: 'Salud', icon: <Heart size={14} />, color: 'rose' },
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
    const isWeekly = userProfile?.habitFrequency === 'weekly';

    // Normalize selectedDate for Weekly Mode (Always use Sunday)
    const effectiveSelectedDate = isWeekly ? endOfWeek(selectedDate, { weekStartsOn: 1 }) : selectedDate;
    const selectedEntry = monthlyData[format(effectiveSelectedDate, 'yyyy-MM-dd')] || { habitsResults: {} };

    // Restriction Logic
    const today = startOfDay(new Date());
    const isFuture = isAfter(startOfDay(effectiveSelectedDate), today);
    const isSunday = getDay(selectedDate) === 0;
    const canEdit = isAdminView || (!isFuture && (isWeekly ? isSunday : true));

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

    const handleSetStatus = async (habit, date, targetStatus) => {
        const habitName = typeof habit === 'string' ? habit : habit.name;
        const dateKey = format(isWeekly ? endOfWeek(date, { weekStartsOn: 1 }) : date, 'yyyy-MM-dd');
        const entry = monthlyData[dateKey] || { date: dateKey, habitsResults: {} };
        const currentStatus = entry.habitsResults?.[habitName];

        let nextStatus;
        if (isWeekly) {
            nextStatus = targetStatus; // targetStatus is the number (0-7)
        } else {
            // Toggle off if clicking the same status
            nextStatus = currentStatus === targetStatus ? null : targetStatus;
        }

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

        if (uncategorized.find(h => (typeof h === 'string' ? h : h.name) === newHabit.trim())) return;

        const hbObj = { name: newHabit.trim(), target: 7 };
        const updatedMinimums = {
            ...currentMinimums,
            uncategorized: [...uncategorized, hbObj]
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
        const dateKey = format(isWeekly ? endOfWeek(date, { weekStartsOn: 1 }) : date, 'yyyy-MM-dd');
        const entry = monthlyData[dateKey];
        if (!entry || !entry.habitsResults) return 'pending';

        const results = entry.habitsResults;
        const rawHabits = getFilteredMinimums();

        if (rawHabits.length === 0) return 'pending';

        if (isWeekly) {
            // Success if all targets are met
            const allTargetsMet = rawHabits.every(h => {
                const hName = typeof h === 'string' ? h : h.name;
                const hTarget = typeof h === 'string' ? 7 : (h.target || 7);
                const val = results[hName];
                return val !== undefined && val !== null && parseInt(val) >= hTarget;
            });
            if (allTargetsMet) return 'success';

            // Partial if any progress made
            const someProgress = rawHabits.some(h => {
                const hName = typeof h === 'string' ? h : h.name;
                const val = results[hName];
                return val !== undefined && val !== null && parseInt(val) > 0;
            });
            return someProgress ? 'partial' : 'pending';
        }

        const habits = rawHabits.map(h => typeof h === 'string' ? h : h.name);
        const activeResults = habits.filter(hName => results[hName] !== undefined && results[hName] !== null);
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
        ].map(h => typeof h === 'string' ? { name: h, target: 7 } : h);
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
        const start = startOfWeek(startOfMonth(viewDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(viewDate), { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start, end });

        return (
            <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100">
                <div className="grid grid-cols-7 mb-4 text-center">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                        <div key={d} className="text-[10px] font-black text-slate-300 py-2">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((date, idx) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const isCurrentMonth = isSameMonth(date, viewDate);
                        const status = getDayStatus(date);

                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={`relative h-10 w-full flex items-center justify-center rounded-2xl text-sm font-bold transition-all
                                    ${isSelected ? 'scale-110 z-10 shadow-md ring-2 ring-slate-900 text-slate-900 bg-white' : 'hover:bg-slate-50 text-slate-400'}
                                    ${!isCurrentMonth ? 'opacity-30 blur-[0.5px]' : ''}
                                    ${status === 'success' ? '!bg-emerald-500 !text-white' :
                                        status === 'fail' ? '!bg-rose-500 !text-white' :
                                            status === 'partial' ? '!bg-amber-400 !text-white' :
                                                'bg-slate-50'}
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

    // Calendar and Entry logic consolidated at top

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

                <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => toggleFilter(cat.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-black ${activeFilters.includes(cat.id) ? `bg-${cat.color}-500 text-white border-${cat.color}-500 shadow-md shadow-${cat.color}-500/10` : 'bg-white text-slate-400 border-slate-100'}`}
                        >
                            {activeFilters.includes(cat.id) ? <Check size={12} strokeWidth={4} /> : cat.icon}
                            <span className="hidden sm:inline">{cat.label}</span>
                            <span className="sm:hidden">{cat.shortLabel}</span>
                        </button>
                    ))}
                    <button
                        onClick={() => toggleFilter('uncategorized')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-[11px] font-black ${activeFilters.includes('uncategorized') ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                        {activeFilters.includes('uncategorized') ? <Check size={12} strokeWidth={4} /> : <Target size={12} />}
                        <span className="hidden sm:inline">Pendientes</span>
                        <span className="sm:hidden">Pend.</span>
                    </button>
                </div>
            </header>

            {renderCalendar()}

            <section className="space-y-6">
                <div className="flex justify-between items-end px-2">
                    <div className="space-y-1">
                        <h2 className="text-xl font-black text-slate-900 capitalize leading-none">
                            {isSameDay(selectedDate, new Date()) ? 'Hoy' : format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                        </h2>
                        {!canEdit && (
                            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                                {isFuture ? '📅 Registro bloqueado (Futuro)' : isWeekly && !isSunday ? '☝️ Selecciona un domingo para registrar' : 'Registro bloqueado'}
                            </p>
                        )}
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setShowAddHabit(true)}
                            className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center gap-1"
                        >
                            <Plus size={14} /> Añadir Mínimo
                        </button>
                    )}
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
                                        const habitName = typeof habit === 'string' ? habit : habit.name;
                                        const habitTarget = typeof habit === 'string' ? 7 : (habit.target || 7);
                                        const status = selectedEntry.habitsResults?.[habitName];

                                        if (isWeekly) {
                                            const daysCount = parseInt(status) || 0;
                                            const isGoalMet = daysCount >= habitTarget;
                                            return (
                                                <div key={habitName} className="p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm space-y-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-sm text-slate-900">{habitName}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Meta: {habitTarget} {habitTarget === 1 ? 'día' : 'días'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isGoalMet && <div className="p-1 bg-emerald-500 text-white rounded-full"><Check size={10} strokeWidth={4} /></div>}
                                                            <span className={`text-xl font-black ${isGoalMet ? 'text-emerald-500' : 'text-indigo-600'}`}>{daysCount}<span className="text-[10px] text-slate-300 ml-1">días</span></span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between gap-1">
                                                        {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                                                            <button
                                                                key={num}
                                                                disabled={!canEdit}
                                                                onClick={() => handleSetStatus(habit, selectedDate, num)}
                                                                className={`flex-1 h-10 rounded-xl font-bold text-xs transition-all ${daysCount === num ? 'bg-indigo-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                {num}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={habitName}
                                                className={`flex items-center justify-between p-4 rounded-3xl border transition-all
                                                    ${status === true ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm' :
                                                        status === false ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm' :
                                                            'bg-white border-slate-100 text-slate-600'}
                                                `}
                                            >
                                                <span className="font-black text-sm flex-1">{habitName}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        disabled={!canEdit}
                                                        onClick={() => handleSetStatus(habit, selectedDate, false)}
                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${!canEdit ? 'opacity-30 cursor-not-allowed' : ''}
                                                            ${status === false ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-50 text-slate-300 hover:bg-rose-50 hover:text-rose-400'}
                                                        `}
                                                    >
                                                        <X size={18} strokeWidth={4} />
                                                    </button>
                                                    <button
                                                        disabled={!canEdit}
                                                        onClick={() => handleSetStatus(habit, selectedDate, true)}
                                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${!canEdit ? 'opacity-30 cursor-not-allowed' : ''}
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
                                    const habitName = typeof habit === 'string' ? habit : habit.name;
                                    const habitTarget = typeof habit === 'string' ? 7 : (habit.target || 7);
                                    const status = selectedEntry.habitsResults?.[habitName];

                                    if (isWeekly) {
                                        const daysCount = parseInt(status) || 0;
                                        const isGoalMet = daysCount >= habitTarget;
                                        return (
                                            <div key={habitName} className="p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm space-y-4">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-sm text-slate-900">{habitName}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Meta: {habitTarget} {habitTarget === 1 ? 'día' : 'días'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isGoalMet && <div className="p-1 bg-emerald-500 text-white rounded-full"><Check size={10} strokeWidth={4} /></div>}
                                                        <span className={`text-xl font-black ${isGoalMet ? 'text-emerald-500' : 'text-indigo-600'}`}>{daysCount}<span className="text-[10px] text-slate-300 ml-1">días</span></span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between gap-1">
                                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(num => (
                                                        <button
                                                            key={num}
                                                            disabled={!canEdit}
                                                            onClick={() => handleSetStatus(habit, selectedDate, num)}
                                                            className={`flex-1 h-10 rounded-xl font-bold text-xs transition-all ${daysCount === num ? 'bg-indigo-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'} ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            {num}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={habitName}
                                            className={`flex items-center justify-between p-4 rounded-3xl border transition-all
                                                ${status === true ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                                                    status === false ? 'bg-rose-50 border-rose-200 text-rose-900' :
                                                        'bg-white border-slate-100 text-slate-600'}
                                            `}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <span className="font-black text-sm block truncate">{habitName}</span>
                                                <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">Pendiente de organizar</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => handleSetStatus(habit, selectedDate, false)}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${!canEdit ? 'opacity-30 cursor-not-allowed' : ''}
                                                        ${status === false ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300 hover:text-rose-400'}
                                                    `}
                                                >
                                                    <X size={18} strokeWidth={4} />
                                                </button>
                                                <button
                                                    disabled={!canEdit}
                                                    onClick={() => handleSetStatus(habit, selectedDate, true)}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${!canEdit ? 'opacity-30 cursor-not-allowed' : ''}
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
