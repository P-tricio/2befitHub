import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { TrainingDB } from '../../services/db';
import { X, Calendar, Trophy, ChevronRight, Search, Clock, Zap, ArrowLeft, Footprints, Dumbbell, CheckSquare, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SessionResultsModal from '../../components/SessionResultsModal';
import TaskResultsModal from '../../components/TaskResultsModal';

import ExerciseHistoryView from '../components/ExerciseHistoryView';

const AthleteHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResults, setSelectedResults] = useState(null);
    const [activeType, setActiveType] = useState('all'); // 'all' | 'session' | 'neat' | 'free_training' | 'nutrition'
    const [mainTab, setMainTab] = useState('activity'); // 'activity' | 'performance'

    useEffect(() => {
        if (currentUser) loadData();
    }, [currentUser]);

    const loadData = async () => {
        try {
            setLoading(true);
            const userData = await TrainingDB.users.getById(currentUser.uid);
            const schedule = userData?.schedule || {};
            const allSessions = await TrainingDB.sessions.getAll();
            const sMap = {};
            allSessions.forEach(s => sMap[s.id] = s);

            const completed = [];
            Object.entries(schedule).forEach(([date, tasks]) => {
                tasks.forEach(task => {
                    if (task.status === 'completed') {
                        completed.push({
                            ...task,
                            scheduledDate: date,
                            session: task.type === 'session' ? sMap[task.sessionId] : null
                        });
                    }
                });
            });

            completed.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
            setHistory(completed);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        const matchesSearch = (item.session?.name || item.title || item.type).toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.scheduledDate.includes(searchTerm);
        const matchesType = activeType === 'all' || item.type === activeType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <header className="bg-white sticky top-0 z-30 border-b border-slate-100 shadow-sm">
                <div className="p-6 pb-2">
                    <div className="flex items-center gap-4 mb-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <ArrowLeft size={24} className="text-slate-900" />
                        </button>
                        <h1 className="text-2xl font-black text-slate-900">Tu Historial</h1>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                        <button
                            onClick={() => setMainTab('activity')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mainTab === 'activity' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Sesiones
                        </button>
                        <button
                            onClick={() => setMainTab('performance')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mainTab === 'performance' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                                }`}
                        >
                            Cargas
                        </button>
                    </div>
                </div>

                {mainTab === 'activity' && (
                    <div className="px-6 pb-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por sesión o fecha..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:border-slate-900 transition-colors shadow-sm focus:shadow-md"
                            />
                        </div>

                        {/* Filter Chips */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 -mx-2 px-2">
                            {[
                                { id: 'all', label: 'Todos', icon: <Trophy size={14} /> },
                                { id: 'session', label: 'Programados', icon: <Clock size={14} /> },
                                { id: 'neat', label: 'Movimiento', icon: <Footprints size={14} /> },
                                { id: 'free_training', label: 'Libre', icon: <Dumbbell size={14} /> },
                                { id: 'nutrition', label: 'Hábitos', icon: <CheckSquare size={14} /> }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setActiveType(type.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shrink-0 whitespace-nowrap
                                        ${activeType === type.id
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                                            : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300 shadow-sm'
                                        }`}
                                >
                                    {type.icon}
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </header>

            {/* Content View */}
            {mainTab === 'activity' ? (
                /* List */
                <div className="p-6">
                    <div className="space-y-4 max-w-lg mx-auto">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando...</p>
                            </div>
                        ) : filteredHistory.length === 0 ? (
                            <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-8">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trophy size={32} className="text-slate-300" />
                                </div>
                                <p className="text-slate-400 font-bold">Aún no has completado entrenamientos.</p>
                                <button onClick={() => navigate('/training')} className="mt-4 text-emerald-600 font-black text-sm uppercase tracking-wider">Comienza a entrenar</button>
                            </div>
                        ) : (
                            filteredHistory.map((item, idx) => (
                                <motion.button
                                    key={`${item.scheduledDate}-${item.id || idx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    onClick={() => setSelectedResults(item)}
                                    className="w-full bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4 text-left group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${item.type === 'session' ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                                        item.type === 'neat' ? 'bg-emerald-50 text-emerald-500 shadow-emerald-500/10' :
                                            item.type === 'free_training' ? 'bg-indigo-500 text-white shadow-indigo-500/20' :
                                                item.type === 'nutrition' ? 'bg-orange-500 text-white shadow-orange-500/20' :
                                                    'bg-blue-500 text-white shadow-blue-500/20'
                                        }`}>
                                        {item.type === 'session' ? <Clock size={24} /> :
                                            item.type === 'neat' ? <Footprints size={24} /> :
                                                item.type === 'free_training' ? <Dumbbell size={24} /> :
                                                    item.type === 'nutrition' ? <CheckSquare size={24} /> :
                                                        <Activity size={24} />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                                {format(parseISO(item.scheduledDate), 'dd MMM yyyy', { locale: es })}
                                            </span>
                                            {item.results?.rpe && (
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RPE {item.results.rpe}</span>
                                            )}
                                        </div>
                                        <h3 className="text-base font-black text-slate-900 truncate">
                                            {item.type === 'session' ? (item.session?.name || 'Sesión de Entrenamiento') : (item.title || item.type)}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1 text-slate-500">
                                            {item.results?.durationMinutes || item.results?.duration ? (
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    <span className="text-[10px] font-bold">
                                                        {item.results.durationMinutes || item.results.duration} min
                                                    </span>
                                                </div>
                                            ) : null}
                                            {item.summary && (
                                                <div className="flex items-center gap-1">
                                                    <Zap size={10} className="text-amber-500" />
                                                    <span className="text-[10px] font-bold text-amber-600 truncate max-w-[120px]">{item.summary}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <ChevronRight size={18} />
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>
            ) : (
                <ExerciseHistoryView userId={currentUser.uid} />
            )}

            {/* Modal de Resultados */}
            <AnimatePresence>
                {selectedResults && (
                    selectedResults.type === 'session' ? (
                        <SessionResultsModal
                            task={selectedResults}
                            session={selectedResults.session}
                            onClose={() => setSelectedResults(null)}
                            userId={currentUser.uid}
                        />
                    ) : (
                        <TaskResultsModal
                            task={selectedResults}
                            onClose={() => setSelectedResults(null)}
                        />
                    )
                )}
            </AnimatePresence>
        </div>
    );
};

export default AthleteHistory;
