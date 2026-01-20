import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { TrainingDB } from '../../services/db';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, Zap, CheckCircle2, User as UserIcon, Footprints, Utensils, ClipboardList, LayoutGrid, CalendarDays } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, subWeeks, addWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const AthleteAgenda = () => {
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date()); // Controls the view (week/month)
    const [selectedDate, setSelectedDate] = useState(new Date()); // Controls the selected task list
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
    const [schedule, setSchedule] = useState({});
    const [sessionsMap, setSessionsMap] = useState({});
    const [, setLoading] = useState(true);

    // Fetch User Schedule (Real-time)
    useEffect(() => {
        if (!currentUser) return;

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSchedule(data.schedule || {});
            }
        });

        return () => unsub();
    }, [currentUser]);

    // Fetch Sessions Metadata
    useEffect(() => {
        const loadSessions = async () => {
            try {
                const allSessions = await TrainingDB.sessions.getAll();
                const map = {};
                allSessions.forEach(s => map[s.id] = s);
                setSessionsMap(map);
            } catch (error) {
                console.error("Error loading sessions", error);
            } finally {
                setLoading(false);
            }
        };
        loadSessions();
    }, []);

    // --- Helpers ---
    const getSessionDetails = (sessionId) => {
        const session = sessionsMap[sessionId];
        if (!session) return { blocks: 0, duration: 0 };

        const blocks = session.blocks || [];
        let totalMinutes = 0;

        // Protocol-specific time caps per block (in minutes)
        // PDP-T: [4, 4, 5, 5, 6, 6] for [Boost, Base, Build A, Build B, Burn A, Burn B]
        // PDP-R: [5, 5, 6, 6, 7, 7] (+1 min more than PDP-T)
        const TIME_CAPS_T = [4, 4, 5, 5, 6, 6];
        const TIME_CAPS_R = [5, 5, 6, 6, 7, 7];
        const TIME_CAPS_E = [4, 4, 5, 5, 6, 6]; // Assuming same as T

        // Detect protocol from session name or blocks
        const sessionName = session.name || '';
        let timeCaps = TIME_CAPS_T; // default

        if (sessionName.includes('PDP-R')) {
            timeCaps = TIME_CAPS_R;
        } else if (sessionName.includes('PDP-E')) {
            timeCaps = TIME_CAPS_E;
        }

        // Add Blocks + Transition time (2 min after each block)
        blocks.forEach((block, idx) => {
            // Use protocol-specific time cap, fallback to targeting or defaults
            const defaultCap = timeCaps[idx] || 4;
            const timeCapMinutes = block.targeting?.[0]?.timeCap
                ? Math.ceil(block.targeting[0].timeCap / 60)
                : defaultCap;

            totalMinutes += timeCapMinutes;

            // Add transition time after each block (2 min)
            totalMinutes += 2;
        });

        return {
            blocks: blocks.length,
            duration: Math.round(totalMinutes)
        };
    };

    const getTasksForDate = (date) => {
        const key = format(date, 'yyyy-MM-dd');
        return schedule[key] || [];
    };

    const isFutureRestricted = (date) => {
        const limitDate = addDays(new Date(), 7);
        // Returns true if date is strictly AFTER limitDate
        // We compare start of days to avoid time issues
        const d = new Date(date).setHours(0, 0, 0, 0);
        const l = limitDate.setHours(0, 0, 0, 0);
        return d > l;
    }

    const getWeekDays = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    };

    const getMonthDays = () => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        const days = eachDayOfInterval({ start, end });

        // Pad start to correct day of week
        const startDay = start.getDay(); // 0 (Sun) - 6 (Sat)
        // Adjust for Monday start: Mon=1, Sun=7. If Mon(1), pad 0. If Tue(2), pad 1. If Sun(0), pad 6.
        const padCount = startDay === 0 ? 6 : startDay - 1;
        const padding = Array(padCount).fill(null);

        return [...padding, ...days];
    };

    // --- Render Logic ---
    const weekDays = getWeekDays();
    const monthDays = getMonthDays();

    // Header Labels
    const currentMonthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
    const weekLabel = `Semana ${format(weekDays[0], 'd')} al ${format(weekDays[6], 'd')}`;

    const selectedTasks = getTasksForDate(selectedDate);

    // Restriction Logic for Task List
    const showTasks = !isFutureRestricted(selectedDate);

    const getTaskIcon = (type) => {
        switch (type) {
            case 'session': return <Zap size={20} />;
            case 'neat': return <Footprints size={20} />;
            case 'nutrition': return <Utensils size={20} />;
            case 'checkin': return <ClipboardList size={20} />;
            default: return <CheckCircle2 size={20} />;
        }
    };

    const getTaskColor = (type) => {
        switch (type) {
            case 'session': return 'bg-orange-50 text-orange-500';
            case 'neat': return 'bg-emerald-50 text-emerald-500';
            case 'nutrition': return 'bg-rose-50 text-rose-500';
            case 'checkin': return 'bg-blue-50 text-blue-500';
            default: return 'bg-slate-50 text-slate-500';
        }
    };

    const getTaskTitle = (task) => {
        if (task.type === 'session') {
            return sessionsMap[task.sessionId]?.name || 'Sesión de Entrenamiento';
        }
        return task.title || 'Tarea';
    };

    const getTaskSubtitle = (task) => {
        if (task.type === 'session') {
            const details = getSessionDetails(task.sessionId);
            return details.blocks > 0
                ? `${details.blocks} bloques • ~${details.duration} min`
                : 'Detalles no disponibles';
        }
        return task.subtitle || 'Programado';
    };

    return (
        <div className="p-6 max-w-lg mx-auto space-y-6 pb-32">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Link to="/profile" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all">
                        <UserIcon size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Agenda</h1>
                </div>
                <div className="flex gap-4 text-slate-400">
                    <button className="hover:text-slate-600 transition-colors">
                        <Bell size={24} />
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                        className={`transition-colors ${viewMode === 'month' ? 'text-emerald-600 bg-emerald-50 rounded-lg' : 'hover:text-slate-600'}`}
                    >
                        {viewMode === 'week' ? <CalendarIcon size={24} /> : <LayoutGrid size={24} />}
                    </button>
                </div>
            </header>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center mb-6">
                <button
                    onClick={() => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}
                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">{currentMonthLabel}</span>
                    {viewMode === 'week' && <span className="text-xs font-medium text-slate-400">{weekLabel}</span>}
                </div>
                <button
                    onClick={() => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}
                    className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-all"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* View Switching */}
            {viewMode === 'week' ? (
                /* Week View */
                <div className="flex justify-between w-full gap-1">
                    {weekDays.map((date, idx) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const hasTasks = getTasksForDate(date).length > 0;
                        const restricted = isFutureRestricted(date);

                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={`flex flex-col items-center justify-center h-20 rounded-full border transition-all flex-1 min-w-0 ${isSelected
                                    ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105'
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-[10px] font-bold mb-1 capitalize truncate w-full px-0.5">{format(date, 'EEEEE', { locale: es })}</span>
                                <span className="text-xl font-bold leading-none">{format(date, 'd')}</span>
                                <div className="flex gap-0.5 mt-1 h-1.5 items-end">
                                    {hasTasks && !restricted && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-300'}`}></div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                /* Month View */
                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="text-[10px] font-bold text-slate-400 py-2">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-2">
                        {monthDays.map((date, idx) => {
                            if (!date) return <div key={idx} />; // Padding

                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const hasTasks = getTasksForDate(date).length > 0;
                            const restricted = isFutureRestricted(date);

                            return (
                                <button
                                    key={date.toString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={`relative h-10 w-full flex items-center justify-center rounded-full text-sm font-medium transition-all
                                        ${isSelected ? 'bg-slate-900 text-white font-bold' : 'text-slate-600 hover:bg-slate-50'}
                                        ${isToday && !isSelected ? 'text-emerald-600 font-bold bg-emerald-50' : ''}
                                    `}
                                >
                                    {format(date, 'd')}
                                    {hasTasks && !restricted && (
                                        <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tasks List */}
            <div className="space-y-3 min-h-[50vh]">
                <h3 className="text-lg font-bold text-slate-900 mb-4 capitalize">
                    {isSameDay(selectedDate, new Date()) ? 'Para hoy' : format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                </h3>

                {/* Restricted View State */}
                {!showTasks ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                        <CalendarDays size={48} className="mb-4 opacity-30" />
                        <p className="font-medium text-sm text-slate-400 text-center max-w-[200px]">
                            Aún no puedes ver la planificación de este día.
                        </p>
                        <p className="text-[10px] text-slate-300 mt-2">Disponible 7 días antes</p>
                    </div>
                ) : selectedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl">
                        <CalendarIcon size={48} className="mb-4 opacity-50" />
                        <p className="font-medium text-sm">No hay tareas programadas</p>
                    </div>
                ) : (
                    selectedTasks.map((task, idx) => (
                        <Link
                            to={task.type === 'session' ? `/training/session/${task.sessionId}` : '#'}
                            key={idx}
                            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-all active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${getTaskColor(task.type)}`}>
                                    {getTaskIcon(task.type)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 leading-tight">{getTaskTitle(task)}</h3>
                                    <p className="text-xs text-slate-400 mt-1">{getTaskSubtitle(task)}</p>
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                <ChevronRight size={16} />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default AthleteAgenda;
