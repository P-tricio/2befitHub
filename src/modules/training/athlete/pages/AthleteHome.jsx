import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Play, Clock, Dumbbell, Zap, Bell, MessageCircle, User as UserIcon, ChevronDown, Footprints, Utensils, ClipboardList, Plus, Camera, Scale, Check, X, CheckSquare, Target } from 'lucide-react';
import CheckinModal from '../components/CheckinModal';
import SessionResultsModal from '../../components/SessionResultsModal';
import ChatDrawer from '../../components/ChatDrawer';
import { motion, AnimatePresence } from 'framer-motion';
import { format, getDay } from 'date-fns';

const AthleteHome = () => {
    const { currentUser } = useAuth();
    const [todayTasks, setTodayTasks] = useState([]);
    const [sessionsMap, setSessionsMap] = useState({});
    const [, setLoading] = useState(true);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
    const [checkinTask, setCheckinTask] = useState(null);
    const [addTaskModal, setAddTaskModal] = useState(false);
    const [sessionResultsTask, setSessionResultsTask] = useState(null);
    const [userCustomMetrics, setUserCustomMetrics] = useState([]);
    const [userMinimums, setUserMinimums] = useState(null);
    const [habitFrequency, setHabitFrequency] = useState('daily');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const userName = currentUser?.displayName?.split(' ')[0] || 'Atleta';

    // Fetch User Schedule (Real-time)
    useEffect(() => {
        if (!currentUser) return;

        const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const schedule = data.schedule || {};
                const todayKey = format(new Date(), 'yyyy-MM-dd');
                setTodayTasks(schedule[todayKey] || []);
                setUserCustomMetrics(data.customMeasurements || []);
                setUserMinimums(data.minimums || null);
                setHabitFrequency(data.habitFrequency || 'daily');
            }
        });

        return () => unsub();
    }, [currentUser]);

    // Listen for Unread Messages
    useEffect(() => {
        if (!currentUser) return;
        const unsubscribe = TrainingDB.messages.listen(currentUser.uid, (msgs) => {
            const count = msgs.filter(m => !m.read && m.senderId !== currentUser.uid).length;
            setUnreadCount(count);
        });
        return () => unsubscribe();
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
                console.error('Error loading sessions:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSessions();
    }, []);

    const toggleSession = (id) => {
        setExpandedSessionId(expandedSessionId === id ? null : id);
    };

    const getSessionDetails = (sessionId) => sessionsMap[sessionId] || null;

    const getComputedTasks = () => {
        const tasks = [...todayTasks];
        const todayKey = format(new Date(), 'yyyy-MM-dd');

        const hasMinimums = userMinimums && (
            (userMinimums.nutrition?.length > 0) ||
            (userMinimums.movement?.length > 0) ||
            (userMinimums.health?.length > 0) ||
            (userMinimums.uncategorized?.length > 0)
        );

        if (hasMinimums) {
            const isWeekly = habitFrequency === 'weekly';
            const isSunday = getDay(new Date()) === 0;

            if (isWeekly && isSunday) {
                // Weekly reporting only on Sundays
                if (!tasks.some(t => t.type === 'nutrition')) {
                    tasks.push({
                        id: 'virtual-habits-weekly-' + todayKey,
                        type: 'nutrition',
                        title: 'Resumen Semanal: Hábitos',
                        is_virtual: true,
                        config: { categories: ['nutrition', 'movement', 'health'], isWeeklyReporting: true }
                    });
                }
            } else if (!isWeekly) {
                // Only show "Yesterday's Reflection" task in the dashboard
                // Real-time tracking for "Today" and history is available in the standalone Habits screen.
                const hasReflectionTask = tasks.some(t => t.type === 'nutrition' && t.config?.retroactive);

                if (!hasReflectionTask) {
                    tasks.push({
                        id: 'virtual-habits-yesterday-' + todayKey,
                        type: 'nutrition',
                        title: 'Reflexión: Ayer',
                        is_virtual: true,
                        config: {
                            categories: ['nutrition', 'movement', 'health'],
                            retroactive: true,
                        }
                    });
                }
            }
        }

        return tasks;
    };

    const computedTasks = getComputedTasks();

    return (
        <>
            <div className="p-6 max-w-lg mx-auto space-y-8 pb-32">
                {/* Header */}
                <header className="space-y-6">
                    {/* Top Row: Logo & Icons */}
                    <div className="flex justify-between items-center">
                        <img src="/brand-compact.png" alt="2BeFit" className="h-8 w-auto" />
                        <div className="flex gap-4">
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="text-slate-400 hover:text-slate-600 transition-colors relative"
                            >
                                <MessageCircle size={24} />
                                {unreadCount > 0 && (
                                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-slate-50" />
                                )}
                            </button>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Bell size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Greeting */}
                    <div className="flex items-center gap-4">
                        <Link to="/training/profile" className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shrink-0 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon size={40} />
                            )}
                        </Link>
                        <div>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Hola de nuevo</p>
                            <p className="text-3xl text-slate-900 font-black leading-none tracking-tight">{userName}</p>
                        </div>
                    </div>
                </header>

                {/* "Plan de hoy" Section */}
                <section>
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tu Plan de Hoy</h2>
                        <Link to="/training/agenda" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center">
                            Ver agenda
                        </Link>
                    </div>

                    {/* Simplified Progress Line */}
                    <div className="flex gap-1.5 h-1.5 mb-8">
                        {computedTasks.length > 0 ? computedTasks.map((t, i) => (
                            <div key={i} className={`flex-1 rounded-full ${t.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                        )) : (
                            <div className="flex-1 bg-slate-100 rounded-full" />
                        )}
                    </div>

                    <div className="space-y-4">
                        {computedTasks.length === 0 ? (
                            <div className="bg-white p-8 rounded-3xl text-center border-2 border-dashed border-slate-100">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Zap className="text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold">¡Día libre! 🎉</p>
                                <p className="text-slate-300 text-xs mt-1">No tienes tareas para hoy</p>
                            </div>
                        ) : (
                            computedTasks.map((task, index) => {
                                const isSession = task.type === 'session';
                                const session = isSession ? getSessionDetails(task.sessionId) : null;

                                // Calculate accurate metadata if it's a session
                                let sessionMetadata = { blocks: 0, duration: 0 };
                                if (isSession && session) {
                                    const blocks = session.blocks || [];
                                    sessionMetadata.blocks = blocks.length;
                                    let totalSeconds = 0;
                                    blocks.forEach(b => {
                                        totalSeconds += b.targeting?.[0]?.timeCap || 240;
                                    });
                                    // Base duration + 3 mins transition between blocks
                                    const baseDuration = Math.ceil(totalSeconds / 60);
                                    const transitionTime = blocks.length > 1 ? (blocks.length - 1) * 3 : 0;
                                    sessionMetadata.duration = baseDuration + transitionTime;
                                }

                                if (isSession && session) {
                                    const isCompleted = task.status === 'completed';

                                    return (
                                        <motion.div
                                            key={task.id || index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`rounded-[2rem] shadow-sm border overflow-hidden transition-all ${isCompleted ? 'bg-white border-emerald-100' : 'bg-white border-slate-100'}`}
                                        >
                                            <button
                                                onClick={() => isCompleted ? setSessionResultsTask({ task, session }) : toggleSession(task.id)}
                                                className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all relative ${isCompleted
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                    : expandedSessionId === task.id
                                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                        : 'bg-orange-50 text-orange-600'
                                                    }`}>
                                                    {isCompleted ? <Check size={24} strokeWidth={3} /> : <Dumbbell size={22} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className={`font-black truncate text-lg ${isCompleted ? 'text-slate-400 line-through decoration-emerald-500/30' : 'text-slate-900'}`}>
                                                            {session.name || 'Sesión de Entrenamiento'}
                                                        </h3>
                                                        {isCompleted && (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black rounded-full uppercase tracking-widest">Listo</span>
                                                        )}
                                                    </div>
                                                    {isCompleted && task.summary ? (
                                                        <p className="text-sm text-emerald-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                                                            <Zap size={10} fill="currentColor" /> {task.summary}
                                                        </p>
                                                    ) : (
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                            <span className="flex items-center gap-1"><Clock size={12} /> {sessionMetadata.duration} min</span>
                                                            <span className="flex items-center gap-1"><Zap size={12} /> {sessionMetadata.blocks} bloques</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {!isCompleted && (
                                                    <div className={`text-slate-300 transition-transform duration-300 ${expandedSessionId === task.id ? 'rotate-180' : ''}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                )}
                                            </button>

                                            <AnimatePresence>
                                                {!isCompleted && expandedSessionId === task.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="border-t border-slate-50"
                                                    >
                                                        <div className="p-5 pt-2 bg-slate-50/30 space-y-4">
                                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                                {session.description || "Sesión de entrenamiento programada."}
                                                            </p>

                                                            <Link
                                                                to={`/training/session/${session.id}`}
                                                                state={{ scheduledDate: format(new Date(), 'yyyy-MM-dd') }}
                                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-center flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
                                                            >
                                                                <Play size={18} fill="currentColor" />
                                                                COMENZAR ENTRENAMIENTO
                                                            </Link>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                }

                                // Non-session tasks (Clickable to Check-in)
                                const isCompleted = task.status === 'completed';
                                return (
                                    <button
                                        key={task.id || index}
                                        onClick={() => setCheckinTask(task)}
                                        className={`w-full p-4 rounded-[1.8rem] shadow-sm border flex items-center justify-between transition-all text-left ${isCompleted ? 'bg-white border-emerald-100/50' : 'bg-white border-slate-100 hover:border-emerald-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/10' :
                                                task.type === 'neat' ? 'bg-emerald-50 text-emerald-500' :
                                                    task.type === 'nutrition' ? 'bg-amber-50 text-amber-500' :
                                                        task.type === 'free_training' ? 'bg-slate-100 text-slate-600' :
                                                            'bg-blue-50 text-blue-500'
                                                }`}>
                                                {isCompleted ? <Check size={20} strokeWidth={3} /> : (
                                                    <>
                                                        {task.type === 'neat' && <Footprints size={20} />}
                                                        {task.type === 'nutrition' && <CheckSquare size={20} />}
                                                        {(task.type === 'tracking' || task.type === 'checkin') && <ClipboardList size={20} />}
                                                        {task.type === 'free_training' && <Dumbbell size={20} />}
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className={`font-black ${isCompleted ? 'text-slate-400 line-through decoration-emerald-500/20' : 'text-slate-800'}`}>
                                                        {task.title || 'Tarea'}
                                                    </h3>
                                                    {isCompleted && (
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[7px] font-black rounded-full uppercase tracking-widest">OK</span>
                                                    )}
                                                </div>
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                    {isCompleted ? (task.summary || 'Completado') : 'Hacer ahora'}
                                                </p>
                                            </div>
                                        </div>
                                        {!isCompleted && <ChevronDown size={18} className="text-slate-200" />}
                                    </button>
                                );
                            })
                        )}
                    </div >
                </section >

                {/* Floating Action Buttons Container */}
                <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto pointer-events-none z-[100] h-full">
                    {/* Chat Floating Button */}
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="absolute bottom-24 right-5 w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center pointer-events-auto hover:scale-105 active:scale-95 transition-all mb-16"
                    >
                        <MessageCircle size={24} />
                        {unreadCount > 0 && (
                            <div className="absolute top-0 right-0 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-slate-900 translate-x-1 -translate-y-1">
                                {unreadCount}
                            </div>
                        )}
                    </button>

                    {/* Add Task Floating Button */}
                    <button
                        onClick={() => setAddTaskModal(true)}
                        className="absolute bottom-24 right-5 w-14 h-14 bg-emerald-500 text-slate-900 rounded-full shadow-2xl flex items-center justify-center pointer-events-auto active:scale-95 transition-all hover:bg-emerald-400 group"
                    >
                        <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* Add Task Modal */}
                < AnimatePresence >
                    {addTaskModal && (
                        <AddTaskModal
                            onClose={() => setAddTaskModal(false)}
                            onTaskCreated={(newTask) => {
                                setAddTaskModal(false);
                                setCheckinTask(newTask);
                            }}
                            userId={currentUser.uid}
                        />
                    )}
                </AnimatePresence >

                {/* Session Results Modal */}
                < AnimatePresence >
                    {sessionResultsTask && (
                        <SessionResultsModal
                            task={sessionResultsTask.task}
                            session={sessionResultsTask.session}
                            onClose={() => setSessionResultsTask(null)}
                            userId={currentUser.uid}
                        />
                    )}
                </AnimatePresence >

                {/* Checkin Modal */}
                < AnimatePresence >
                    {checkinTask && (
                        <CheckinModal
                            task={checkinTask}
                            onClose={async (wasSaved) => {
                                if (!wasSaved && checkinTask.is_new) {
                                    try {
                                        const today = format(new Date(), 'yyyy-MM-dd');
                                        const { _selectedDate, ...cleanTask } = checkinTask;
                                        await TrainingDB.users.removeTaskFromSchedule(currentUser.uid, today, cleanTask);
                                    } catch (e) {
                                        console.error("Error removing abandoned task:", e);
                                    }
                                }
                                setCheckinTask(null);
                            }}
                            userId={currentUser.uid}
                            targetDate={new Date()}
                            customMetrics={userCustomMetrics}
                        />
                    )}
                </AnimatePresence >
            </div >

            <ChatDrawer
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                athleteId={currentUser.uid}
                athleteName="Tu Coach"
            />
        </>
    );
};

const AddTaskModal = ({ onClose, onTaskCreated, userId }) => {
    const handleAdd = async (type) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        let newTask = {
            id: Date.now().toString(),
            type: type,
            status: 'pending',
            is_user_task: true,
            is_new: true
        };

        if (type === 'neat') { newTask.title = 'Movimiento'; }
        else if (type === 'nutrition') { newTask.title = 'Mis Hábitos'; }
        else if (type === 'checkin' || type === 'tracking') { newTask.title = 'Seguimiento'; }
        else if (type === 'free_training') { newTask.title = 'Entrenamiento Libre'; }

        try {
            await TrainingDB.users.addTaskToSchedule(userId, today, newTask);
            onTaskCreated(newTask);
        } catch (error) {
            console.error("Error adding task:", error);
            alert("Error al añadir tarea");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl z-[110] overflow-hidden p-8"
            >
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-black text-slate-900">Añadir Actividad</h3>
                    <button onClick={onClose} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="grid gap-3">
                    {[
                        { id: 'neat', label: 'Movimiento', icon: <Footprints size={20} />, color: 'emerald' },
                        { id: 'nutrition', label: 'Hábitos', icon: <CheckSquare size={20} />, color: 'orange' },
                        { id: 'tracking', label: 'Seguimiento', icon: <ClipboardList size={20} />, color: 'blue' },
                        { id: 'free_training', label: 'Entreno Libre', icon: <Dumbbell size={20} />, color: 'slate' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => handleAdd(btn.id)}
                            className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-all text-left active:scale-[0.98]"
                        >
                            <div className={`w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-${btn.color}-500`}>
                                {btn.icon}
                            </div>
                            <span className="block font-black text-slate-900">{btn.label}</span>
                        </button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default AthleteHome;
