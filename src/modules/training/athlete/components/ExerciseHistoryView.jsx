import React, { useState, useEffect, useMemo } from 'react';
import { TrainingDB } from '../../services/db';
import { Search, ChevronRight, TrendingUp, Calendar, Dumbbell, History, Maximize2, Info, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

const ExerciseHistoryView = ({ userId }) => {
    const [exercisesWithHistory, setExercisesWithHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExerciseId, setSelectedExerciseId] = useState(null);
    const [selectedExerciseLogs, setSelectedExerciseLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'chart'

    // Load list of exercises that have history
    useEffect(() => {
        const loadExercises = async () => {
            if (!userId) return;
            try {
                setLoading(true);
                // We need names too, so we'll fetch entries from the exercise_history collections
                // TrainingDB.exerciseHistory.getAllExercises only returns IDs
                const exerciseIds = await TrainingDB.exerciseHistory.getAllExercises(userId);

                // For each ID, get the last log to get the name (more efficient than fetching all metadata)
                const exerciseList = await Promise.all(exerciseIds.map(async (id) => {
                    const latest = await TrainingDB.exerciseHistory.getHistory(userId, id, 1);
                    return {
                        id,
                        name: latest[0]?.exerciseName || 'Ejercicio sin nombre',
                        lastDate: latest[0]?.date?.toDate?.() || new Date(latest[0]?.date || 0),
                        lastWeight: latest[0]?.maxWeight || 0
                    };
                }));

                // Sort by last performed
                exerciseList.sort((a, b) => b.lastDate - a.lastDate);
                setExercisesWithHistory(exerciseList);
            } catch (err) {
                console.error("Error loading exercises with history:", err);
            } finally {
                setLoading(false);
            }
        };

        loadExercises();
    }, [userId]);

    // Load logs for selected exercise
    useEffect(() => {
        const loadLogs = async () => {
            if (!userId || !selectedExerciseId) return;
            try {
                setLoadingLogs(true);
                const logs = await TrainingDB.exerciseHistory.getHistory(userId, selectedExerciseId, 50);
                setSelectedExerciseLogs(logs);
            } catch (err) {
                console.error("Error loading exercise logs:", err);
            } finally {
                setLoadingLogs(false);
            }
        };

        loadLogs();
    }, [userId, selectedExerciseId]);

    const filteredExercises = exercisesWithHistory.filter(ex =>
        ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const chartData = useMemo(() => {
        return [...selectedExerciseLogs]
            .reverse() // Chronological order
            .map(log => ({
                date: format(log.date?.toDate?.() || new Date(log.date), 'dd/MM'),
                fullDate: format(log.date?.toDate?.() || new Date(log.date), 'dd MMM yyyy', { locale: es }),
                weight: log.maxWeight,
                protocol: log.protocol || '?',
                context: log.blockType || log.protocol || 'Otro'
            }));
    }, [selectedExerciseLogs]);

    const personalBest = useMemo(() => {
        if (selectedExerciseLogs.length === 0) return 0;
        return Math.max(...selectedExerciseLogs.map(l => l.maxWeight || 0));
    }, [selectedExerciseLogs]);

    const selectedExerciseName = exercisesWithHistory.find(e => e.id === selectedExerciseId)?.name;

    if (loading && !selectedExerciseId) {
        return (
            <div className="py-20 text-center">
                <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando ejercicios...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {!selectedExerciseId ? (
                // LIST VIEW: SELECT EXERCISE
                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar historial por ejercicio..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-slate-900 transition-colors shadow-sm"
                        />
                    </div>

                    {filteredExercises.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <History size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold">No hay registros de cargas aún.</p>
                            <p className="text-xs text-slate-400 mt-2">Completa bloques de fuerza en tus sesiones para ver tu progreso.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {filteredExercises.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => setSelectedExerciseId(ex.id)}
                                    className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-slate-300 hover:shadow-md transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                            <Dumbbell size={20} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-sm font-black text-slate-900">{ex.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                                Último: {ex.lastWeight} kg • {format(ex.lastDate, 'dd MMM')}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-900 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                // DETAIL VIEW: CHART & LOGS
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col"
                >
                    {/* Header Detail */}
                    <div className="bg-white p-6 border-b border-slate-100 sticky top-0 z-20">
                        <button
                            onClick={() => setSelectedExerciseId(null)}
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-2 group"
                        >
                            <ChevronRight size={16} className="rotate-180" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Volver al listado</span>
                        </button>
                        <h2 className="text-xl font-black text-slate-900 mb-4">{selectedExerciseName}</h2>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Récord Personal</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-emerald-700">{personalBest}</span>
                                    <span className="text-xs font-bold text-emerald-600">kg</span>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block mb-1">Entrenos Registrados</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-blue-700">{selectedExerciseLogs.length}</span>
                                    <span className="text-xs font-bold text-blue-600">veces</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 pb-32 space-y-6">
                        {/* CHART SECTION */}
                        <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <TrendingUp size={64} className="text-slate-900" />
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    <TrendingUp size={14} />
                                    Progresión de Carga
                                </h3>
                            </div>

                            <div className="h-48 w-full mt-4">
                                {selectedExerciseLogs.length > 1 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                                            />
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800">
                                                                <p className="text-[10px] font-black text-slate-400 mb-1">{data.fullDate}</p>
                                                                <p className="text-sm font-black text-white">{data.weight} kg</p>
                                                                <p className="text-[8px] font-bold text-emerald-400 uppercase mt-1">{data.context}</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="weight"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorWeight)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                        <Info size={24} className="text-slate-300 mb-2" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Se necesitan al menos 2 registros para mostrar una gráfica de progresión.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* LOGS LIST */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 px-2">
                                <History size={14} />
                                Historial Detallado
                            </h3>

                            <div className="space-y-3">
                                {selectedExerciseLogs.map((log, idx) => (
                                    <div
                                        key={log.id || idx}
                                        className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span className="text-[10px] font-black text-slate-900 uppercase">
                                                    {format(log.date?.toDate?.() || new Date(log.date), 'dd MMMM yyyy', { locale: es })}
                                                </span>
                                            </div>
                                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${log.blockType === 'BOOST' ? 'bg-amber-100 text-amber-600' :
                                                    log.blockType === 'BASE' ? 'bg-indigo-100 text-indigo-600' :
                                                        'bg-slate-100 text-slate-500'
                                                }`}>
                                                {log.blockType || log.protocol || 'Mix'}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Carga Máxima</span>
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-lg font-black text-slate-900">{log.maxWeight}</span>
                                                    <span className="text-[10px] font-bold text-slate-500">kg</span>
                                                </div>
                                            </div>

                                            <div className="flex-1 overflow-x-auto no-scrollbar py-1">
                                                <div className="flex items-center gap-2">
                                                    {log.sets?.map((set, sIdx) => (
                                                        <div key={sIdx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 min-w-[50px] text-center">
                                                            <div className="text-[8px] font-black text-slate-400 uppercase mb-0.5">S{sIdx + 1}</div>
                                                            <div className="text-[10px] font-black text-slate-900">{set.weight}k × {set.reps}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default ExerciseHistoryView;
