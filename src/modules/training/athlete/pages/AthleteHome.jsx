import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Play, Clock, Dumbbell, Zap, Bell, MessageCircle, User as UserIcon, ChevronDown, Footprints, Utensils, ClipboardList, Plus, Camera, Scale, Check, X, CheckSquare, Target } from 'lucide-react';
import CheckinModal from '../components/CheckinModal';
import SessionResultsModal from '../../components/SessionResultsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

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

    const getSessionDetails = (sessionId) => sessionsMap[sessionId] || {};

    return (
        <div className="p-6 max-w-lg mx-auto space-y-8 pb-32">
            {/* Header */}
            <header className="space-y-6">
                {/* Top Row: Logo & Icons */}
                <div className="flex justify-between items-center">
                    <img src="/brand-compact.png" alt="2BeFit" className="h-8 w-auto" />
                    <div className="flex gap-4">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
                            <MessageCircle size={24} />
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <Bell size={24} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Greeting */}
                <div className="flex items-center gap-4">
                    <Link to="/training/profile" className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shrink-0 overflow-hidden">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={24} />
                        )}
                    </Link>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Bienvenido</p>
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
                    {todayTasks.length > 0 ? todayTasks.map((t, i) => (
                        <div key={i} className={`flex-1 rounded-full ${t.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                    )) : (
                        <div className="flex-1 bg-slate-100 rounded-full" />
                    )}
                </div>

                <div className="space-y-4">
                    {todayTasks.length === 0 ? (
                        <div className="bg-white p-8 rounded-3xl text-center border-2 border-dashed border-slate-100">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Zap className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold">¡Día libre! 🎉</p>
                            <p className="text-slate-300 text-xs mt-1">No tienes tareas para hoy</p>
                        </div>
                    ) : (
                        todayTasks.map((task, index) => {
                            const isSession = task.type === 'session';
                            const session = isSession ? getSessionDetails(task.sessionId) : null;

                            if (isSession && session) {
                                const isCompleted = task.status === 'completed';

                                return (
                                    <motion.div
                                        key={task.id || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`rounded-[2rem] shadow-sm border overflow-hidden ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}
                                    >
                                        <button
                                            onClick={() => isCompleted ? setSessionResultsTask({ task, session }) : toggleSession(task.id)}
                                            className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors relative ${isCompleted
                                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                : expandedSessionId === task.id
                                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                                    : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {isCompleted ? <Check size={24} strokeWidth={3} /> : <Dumbbell size={22} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={`font-black truncate text-lg ${isCompleted ? 'text-emerald-800' : 'text-slate-900'}`}>
                                                    {session.name || 'Sesión de Entrenamiento'}
                                                </h3>
                                                {isCompleted && task.summary ? (
                                                    <p className="text-sm text-emerald-600 font-bold uppercase tracking-wider text-[10px]">{task.summary} completo</p>
                                                ) : (
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                        <span className="flex items-center gap-1"><Clock size={12} /> {session.duration || '60 min'}</span>
                                                        <span className="flex items-center gap-1"><Zap size={12} /> {session.blockCount || 4} bloques</span>
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
                                    className={`w-full p-4 rounded-2xl shadow-sm border flex items-center justify-between transition-all text-left ${isCompleted ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-emerald-200'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isCompleted ? 'bg-slate-50 text-slate-400' :
                                            task.type === 'neat' ? 'bg-emerald-50 text-emerald-500' :
                                                task.type === 'nutrition' ? 'bg-orange-50 text-orange-500' :
                                                    task.type === 'free_training' ? 'bg-slate-100 text-slate-600' :
                                                        'bg-blue-50 text-blue-500'
                                            }`}>
                                            {task.type === 'neat' && <Footprints size={20} />}
                                            {task.type === 'nutrition' && <CheckSquare size={20} />}
                                            {(task.type === 'tracking' || task.type === 'checkin') && <ClipboardList size={20} />}
                                            {task.type === 'free_training' && <Dumbbell size={20} />}
                                        </div>
                                        <div>
                                            <h3 className={`font-black ${isCompleted ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {task.title || 'Tarea Programada'}
                                            </h3>
                                            {isCompleted ? (task.summary || 'COMPLETADO') : (task.type === 'nutrition' ? 'MARCAR HÁBITOS' : 'TOCA PARA REGISTRAR')}
                                        </div>
                                    </div>
                                    <div className="text-slate-200">
                                        <ChevronDown size={20} className="-rotate-90" />
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </section>

            {/* Floating Action Button */}
            <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto pointer-events-none z-[100] h-full">
                <button
                    onClick={() => setAddTaskModal(true)}
                    className="absolute bottom-24 right-5 w-14 h-14 bg-emerald-500 text-slate-900 rounded-full shadow-2xl flex items-center justify-center pointer-events-auto active:scale-95 transition-all hover:bg-emerald-400 group"
                >
                    <Plus size={28} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                </button>
            </div>

            {/* Add Task Modal */}
            <AnimatePresence>
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
            </AnimatePresence>

            {/* Session Results Modal */}
            <AnimatePresence>
                {sessionResultsTask && (
                    <SessionResultsModal
                        task={sessionResultsTask.task}
                        session={sessionResultsTask.session}
                        onClose={() => setSessionResultsTask(null)}
                        userId={currentUser.uid}
                    />
                )}
            </AnimatePresence>

            {/* Checkin Modal */}
            <AnimatePresence>
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
                        customMetrics={userCustomMetrics}
                    />
                )}
            </AnimatePresence>


        </div>
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
