import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Play, Clock, Dumbbell, Zap, Bell, MessageCircle, User as UserIcon, ChevronDown, ChevronUp, Footprints, Utensils, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

const AthleteHome = () => {
    const { currentUser } = useAuth();
    const [todayTasks, setTodayTasks] = useState([]);
    const [sessionsMap, setSessionsMap] = useState({});
    const [, setLoading] = useState(true);
    const [expandedSessionId, setExpandedSessionId] = useState(null);
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
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50"></span>
                        </button>
                        <button className="text-slate-400 hover:text-slate-600 transition-colors">
                            <Bell size={24} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Greeting */}
                <div className="flex items-center gap-4">
                    <Link to="/profile" className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shrink-0">
                        <UserIcon size={24} />
                    </Link>
                    <div>
                        <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Buenos días</p>
                        <p className="text-3xl text-slate-900 font-black leading-none tracking-tight">{userName}</p>
                    </div>
                </div>
            </header>

            {/* "Plan de hoy" Section */}
            <section>
                <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tu Plan de Hoy</h2>
                    <Link to="/training/agenda" className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors">
                        Ver agenda
                    </Link>
                </div>

                {/* Progress Bar Strip */}
                <div className="flex gap-1.5 h-1.5 mb-8">
                    <div className="flex-1 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1 bg-slate-200 rounded-full"></div>
                    <div className="flex-1 bg-slate-200 rounded-full"></div>
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
                            // Logic to display different cards based on task type
                            // For now we focus on Sessions, others can be simple cards
                            const isSession = task.type === 'session';
                            const session = isSession ? getSessionDetails(task.sessionId) : null;

                            if (isSession && session) {
                                return (
                                    <motion.div
                                        key={task.id || index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                                    >
                                        <button
                                            onClick={() => toggleSession(task.id)}
                                            className="w-full p-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${expandedSessionId === task.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-50 text-emerald-600'}`}>
                                                <Dumbbell size={22} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-slate-900 truncate text-lg">{session.name || 'Sesión de Entrenamiento'}</h3>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-0.5">
                                                    <span className="flex items-center gap-1"><Clock size={12} /> {session.duration || '60 min'}</span>
                                                    <span className="flex items-center gap-1"><Zap size={12} /> {session.blockCount || 4} bloques</span>
                                                </div>
                                            </div>
                                            <div className={`text-slate-300 transition-transform duration-300 ${expandedSessionId === task.id ? 'rotate-180' : ''}`}>
                                                <ChevronDown size={20} />
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedSessionId === task.id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-slate-50"
                                                >
                                                    <div className="p-5 pt-2 bg-slate-50/30 space-y-4">
                                                        <p className="text-sm text-slate-600 leading-relaxed">
                                                            {session.description || "Sesión de entrenamiento programada."}
                                                        </p>

                                                        <div className="flex gap-2 pb-2">
                                                            <span className="px-2 py-1 rounded-md bg-white border border-slate-100 text-[10px] font-bold text-slate-500">Training</span>
                                                        </div>

                                                        <Link
                                                            to={`/training/session/${session.id}`}
                                                            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
                                                        >
                                                            <Play size={18} fill="currentColor" />
                                                            Comenzar
                                                        </Link>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            }

                            // Non-session tasks (Simple render)
                            return (
                                <div key={task.id || index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center">
                                            {task.type === 'neat' && <Footprints size={18} />}
                                            {task.type === 'nutrition' && <Utensils size={18} />}
                                            {task.type === 'checkin' && <ClipboardList size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{task.title || 'Tarea Programada'}</h3>
                                            <p className="text-xs text-slate-400">Todo el día</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>
        </div>
    );
};

export default AthleteHome;
