import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrainingDB } from './services/db';
import { Calendar, ChevronRight, Clock, Dumbbell, Play, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const TrainingDashboard = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSessions = async () => {
            try {
                // In production this would filter by "Assigned for Today/Week"
                const allSessions = await TrainingDB.sessions.getAll();
                setSessions(allSessions);
            } catch (error) {
                console.error('Error loading sessions:', error);
            } finally {
                setLoading(false);
            }
        };
        loadSessions();
    }, []);

    const getDateString = () => {
        const d = new Date();
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Clean Header */}
            <div className="bg-white pt-8 pb-6 px-6 shadow-sm border-b border-slate-100 flex justify-between items-center sticky top-0 z-30">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 leading-none">Entrenamiento</h1>
                    <p className="text-sm text-slate-400 font-bold capitalize mt-1">{getDateString()}</p>
                </div>

                {/* Coach Mode Button - Subtle but accessible */}
                <Link
                    to="/training/admin"
                    className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"
                    title="Modo Entrenador"
                >
                    <Shield size={18} />
                </Link>
            </div>

            {/* Content Container */}
            <div className="p-6 space-y-6 max-w-lg mx-auto">

                {/* Status/Progress Banner (Simplified) */}
                <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <Zap size={16} className="text-emerald-400" />
                            <span className="text-[10px] uppercase font-black tracking-widest">Tu Progreso</span>
                        </div>
                        <h2 className="text-2xl font-bold leading-tight mb-1">Mantén la racha</h2>
                        <p className="text-slate-400 text-sm mb-4">La constancia es la clave del éxito.</p>

                        <div className="flex gap-2">
                            <div className="px-3 py-1 bg-white/10 rounded-lg text-xs font-bold border border-white/10 backdrop-blur-md">Week 1</div>
                        </div>
                    </div>
                </div>

                {/* Session Grid */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-lg font-bold text-slate-900">Disponibles</h3>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{sessions.length} Sesiones</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col gap-4">
                            {[1, 2].map(i => (
                                <div key={i} className="h-28 bg-white rounded-3xl animate-pulse shadow-sm border border-slate-100"></div>
                            ))}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="bg-white p-8 rounded-3xl text-center border-2 border-dashed border-slate-200/50">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Dumbbell size={24} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold">No tienes sesiones asignadas</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {sessions.map((session, index) => (
                                <motion.div
                                    key={session.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Link to={`session/${session.id}`} className="group relative block bg-white rounded-3xl p-5 shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-500/30 transition-all hover:-translate-y-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="font-extrabold text-lg text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors mb-1">
                                                    {session.name}
                                                </h4>
                                                <p className="text-xs text-slate-500 font-medium line-clamp-1">{session.objective || 'Entrenamiento General'}</p>
                                            </div>
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm">
                                                <Play size={20} fill="currentColor" className="ml-0.5" />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                <Clock size={14} />
                                                <span>{session.totalDuration || 60}'</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                                                <Dumbbell size={14} />
                                                <span>{(session.blocks?.BASE || []).length + (session.blocks?.BUILD || []).length} Bloques</span>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TrainingDashboard;
