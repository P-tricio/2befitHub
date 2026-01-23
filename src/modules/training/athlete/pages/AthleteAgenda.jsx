import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { TrainingDB } from '../../services/db';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bell, Zap, Footprints, Utensils, ClipboardList, LayoutGrid, Dumbbell, Scale, Plus, Camera, Check, X, User as UserIcon, CheckSquare } from 'lucide-react';
import CheckinModal from '../components/CheckinModal';
import SessionResultsModal from '../../components/SessionResultsModal';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, subWeeks, addWeeks, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const AthleteAgenda = () => {
    const { currentUser } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
    const [schedule, setSchedule] = useState({});
    const [sessionsMap, setSessionsMap] = useState({});
    const [, setLoading] = useState(true);
    const [checkinTask, setCheckinTask] = useState(null);
    const [sessionResultsTask, setSessionResultsTask] = useState(null);
    const [userCustomMetrics, setUserCustomMetrics] = useState([]);

    useEffect(() => {
        if (!currentUser) return;
        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setSchedule(data.schedule || {});
                setUserCustomMetrics(data.customMeasurements || []);
            }
        });
        return () => unsub();
    }, [currentUser]);

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

    const getSessionDetails = (sessionId) => {
        const session = sessionsMap[sessionId];
        if (!session) return { blocks: 0, duration: 60 };
        return { blocks: session.blockCount || 0, duration: session.duration || 60 };
    };

    const getTasksForDate = (date) => {
        const key = format(date, 'yyyy-MM-dd');
        return schedule[key] || [];
    };

    const isFutureRestricted = (date) => {
        const limitDate = addDays(new Date(), 14); // Extended to 14 days for better UX
        const d = new Date(date).setHours(0, 0, 0, 0);
        const l = limitDate.setHours(0, 0, 0, 0);
        return d > l;
    }

    const getWeekDays = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    };

    const getMonthDays = () => {
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    };

    const weekDays = getWeekDays();
    const monthDays = getMonthDays();
    const currentMonthLabel = format(currentDate, 'MMMM yyyy', { locale: es });
    const selectedTasks = getTasksForDate(selectedDate);
    const showTasks = !isFutureRestricted(selectedDate);

    return (
        <div className="p-4 max-w-xl mx-auto space-y-4 pb-32">
            <header className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <Link to="/training/profile" className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 transition-all shrink-0 overflow-hidden">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={20} />
                        )}
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agenda</h1>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'week' ? 'month' : 'week')}
                        className={`p-3 rounded-2xl border transition-all shadow-sm ${viewMode === 'month' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'}`}
                    >
                        {viewMode === 'week' ? <CalendarIcon size={22} /> : <LayoutGrid size={22} />}
                    </button>
                </div>
            </header>

            {/* Navigation */}
            <div className="flex justify-between items-center bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm">
                <button
                    onClick={() => setCurrentDate(viewMode === 'week' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{currentMonthLabel}</span>
                <button
                    onClick={() => setCurrentDate(viewMode === 'week' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-all"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            {/* Calendar View */}
            {viewMode === 'week' ? (
                <div className="flex justify-between w-full gap-2">
                    {weekDays.map((date, idx) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const hasTasks = getTasksForDate(date).length > 0;
                        const restricted = isFutureRestricted(date);

                        return (
                            <button
                                key={date.toString()}
                                onClick={() => setSelectedDate(date)}
                                className={`flex flex-col items-center justify-center h-24 rounded-[1.5rem] border transition-all flex-1 min-w-0 ${isSelected
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105 z-10'
                                    : isToday ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <span className="text-[10px] font-black mb-2 capitalize truncate w-full px-0.5">{format(date, 'EEE', { locale: es })}</span>
                                <span className="text-xl font-black leading-none">{format(date, 'd')}</span>
                                <div className="mt-2 h-1 flex gap-0.5">
                                    {hasTasks && !restricted && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-emerald-500'}`}></div>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                    <div className="grid grid-cols-7 mb-4 text-center">
                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                            <div key={d} className="text-[10px] font-black text-slate-300 py-2">{d}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1">
                        {monthDays.map((date, idx) => {
                            const isSelected = isSameDay(date, selectedDate);
                            const isToday = isSameDay(date, new Date());
                            const isOutsideMonth = !isSameMonth(date, currentDate);
                            const hasTasks = getTasksForDate(date).length > 0;
                            const restricted = isFutureRestricted(date);

                            return (
                                <button
                                    key={date.toString()}
                                    onClick={() => setSelectedDate(date)}
                                    className={`relative h-10 w-full flex items-center justify-center rounded-2xl text-sm font-bold transition-all
                                        ${isSelected ? 'bg-slate-900 text-white shadow-lg z-10' : 'text-slate-600 hover:bg-slate-50'}
                                        ${isToday && !isSelected ? 'text-emerald-500 bg-emerald-50' : ''}
                                        ${isOutsideMonth ? 'opacity-30 grayscale' : ''}
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

            {/* Task List Header */}
            <div className="pt-4 flex justify-between items-end">
                <h2 className="text-xl font-black text-slate-900 capitalize">
                    {isSameDay(selectedDate, new Date()) ? 'Hoy' : format(selectedDate, 'EEEE, d MMMM', { locale: es })}
                </h2>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {selectedTasks.length} Tareas
                </div>
            </div>

            {/* Task List */}
            <div className="space-y-3 min-h-[40vh]">
                {!showTasks ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] p-12 text-center text-slate-300">
                        <Check size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-black text-xs uppercase tracking-widest">Planificación Oculta</p>
                    </div>
                ) : selectedTasks.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2rem] p-12 text-center text-slate-200">
                        <Plus size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-black text-xs uppercase tracking-widest">Sin Tareas</p>
                    </div>
                ) : (
                    selectedTasks.map((task, idx) => {
                        const isSession = task.type === 'session';
                        const isCompleted = task.status === 'completed';
                        const session = isSession ? sessionsMap[task.sessionId] : null;

                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (isSession && isCompleted) setSessionResultsTask({ task, session });
                                    else if (!isSession) setCheckinTask({ ...task, _selectedDate: selectedDate });
                                }}
                                className={`w-full p-4 rounded-[1.8rem] border flex items-center justify-between transition-all text-left shadow-sm group ${isCompleted ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-emerald-100'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-50 text-slate-400' :
                                        task.type === 'session' ? 'bg-orange-50 text-orange-500' :
                                            task.type === 'neat' ? 'bg-emerald-50 text-emerald-500' :
                                                task.type === 'nutrition' ? 'bg-orange-50 text-orange-500' :
                                                    task.type === 'free_training' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-blue-50 text-blue-500'
                                        }`}>
                                        {task.type === 'session' && <Dumbbell size={20} />}
                                        {task.type === 'neat' && <Footprints size={20} />}
                                        {task.type === 'nutrition' && <CheckSquare size={20} />}
                                        {(task.type === 'tracking' || task.type === 'checkin') && <ClipboardList size={20} />}
                                        {task.type === 'free_training' && <Dumbbell size={20} />}
                                    </div>
                                    <div>
                                        <h3 className={`font-black ${isCompleted ? 'text-slate-400 text-sm' : 'text-slate-800'}`}>
                                            {isSession ? (session?.name || 'Entreno') : (task.title || 'Tarea')}
                                        </h3>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                            {isCompleted ? (task.summary || 'COMPLETADO') : (isSession ? 'Programado' : 'Pendiente')}
                                        </p>
                                    </div>
                                </div>
                                {isSession && !isCompleted ? (
                                    <Link
                                        to={`/training/session/${task.sessionId}`}
                                        state={{ scheduledDate: format(selectedDate, 'yyyy-MM-dd') }}
                                        className="bg-slate-900 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                    >
                                        <ChevronRight size={18} />
                                    </Link>
                                ) : (
                                    <div className="text-slate-200">
                                        <ChevronRight size={18} />
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {checkinTask && (
                    <CheckinModal
                        task={checkinTask}
                        onClose={() => setCheckinTask(null)}
                        userId={currentUser.uid}
                        targetDate={selectedDate}
                        customMetrics={userCustomMetrics}
                    />
                )}
                {sessionResultsTask && (
                    <SessionResultsModal
                        task={sessionResultsTask.task}
                        session={sessionResultsTask.session}
                        onClose={() => setSessionResultsTask(null)}
                        userId={currentUser.uid}
                    />
                )}

            </AnimatePresence>
        </div>
    );
};

export default AthleteAgenda;
