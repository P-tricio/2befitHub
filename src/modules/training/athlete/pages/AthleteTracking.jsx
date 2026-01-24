import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, TrendingUp, TrendingDown, Activity, ChevronRight, Scale, Footprints, Settings, Trash2, CalendarDays, BarChart } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import PhotoComparisonModal from '../../components/PhotoComparisonModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AthleteTracking = () => {
    const { currentUser } = useAuth();
    const scrollContainerRef = useRef(null);
    const [isComparingPhotos, setIsComparingPhotos] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeMetric, setActiveMetric] = useState('weight');
    const [useSmoothing, setUseSmoothing] = useState(false);
    const [customMetrics, setCustomMetrics] = useState(currentUser?.customMeasurements?.length > 0 ? currentUser.customMeasurements : ['waist', 'hip']);
    const [collapsedSections, setCollapsedSections] = useState({ kpis: false, analysis: false });

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    useEffect(() => {
        if (!currentUser) return;
        loadHistory();
    }, [currentUser]);

    const loadHistory = async () => {
        try {
            // Fetch tracking history ordered by date
            const data = await TrainingDB.tracking.getHistory(currentUser.uid, 50);
            setHistory(data || []);
        } catch (err) {
            console.error("Error loading tracking history", err);
        } finally {
            setLoading(false);
        }
    };

    const getSmoothedData = (data, metric) => {
        if (!useSmoothing) return data;
        const windowSize = 5;

        return data.map((entry, idx, arr) => {
            const window = arr.slice(Math.max(0, idx - windowSize + 1), idx + 1);
            const values = window.map(e => {
                if (metric === 'weight') return e.weight;
                if (metric === 'steps') return e.steps;
                return e.measurements?.[metric];
            }).filter(v => v !== null && v !== undefined);

            if (values.length === 0) return entry;
            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            const smoothedEntry = { ...entry };
            if (metric === 'weight') smoothedEntry.weight = parseFloat(avg.toFixed(1));
            else if (metric === 'steps') smoothedEntry.steps = Math.round(avg);
            else {
                smoothedEntry.measurements = { ...smoothedEntry.measurements, [metric]: parseFloat(avg.toFixed(1)) };
            }
            return smoothedEntry;
        });
    };

    const chartData = getSmoothedData(history, activeMetric);

    // Stats calculation
    const currentWeight = history.length > 0 ? history[history.length - 1].weight : null;
    const startWeight = history.length > 0 ? history[0].weight : null;
    const weightChange = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : 0;
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;

    return (
        <div className="p-4 md:p-6 max-w-lg lg:max-w-4xl mx-auto space-y-6 pb-32">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Progreso</h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1 italic">Tus estadísticas en tiempo real</p>
                </div>
            </header>

            {/* KPI Summary Bar */}
            <div className="flex items-center justify-between mb-2 px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Resumen Rápido</h4>
                <button
                    onClick={() => toggleSection('kpis')}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                >
                    {collapsedSections.kpis ? 'Mostrar' : 'Contraer'}
                </button>
            </div>
            <AnimatePresence initial={false}>
                {!collapsedSections.kpis && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                        <Scale size={16} />
                                    </div>
                                    {weightChange !== 0 && (
                                        <div className={`px-2 py-0.5 rounded-full text-[8px] font-black ${weightChange < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {weightChange < 0 ? '-' : '+'}{Math.abs(weightChange)}kg
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Actual</p>
                                    <p className="text-xl font-black text-slate-900">{currentWeight || '--'} <span className="text-[10px] text-slate-400">kg</span></p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <Footprints size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último NEAT</p>
                                    <p className="text-xl font-black text-slate-900">{lastEntry?.steps?.toLocaleString() || '--'} <span className="text-[10px] text-slate-400">pasos</span></p>
                                </div>
                            </div>

                            <div className="hidden md:flex bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex-col gap-2">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                    <Activity size={16} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entradas</p>
                                    <p className="text-xl font-black text-slate-900">{history.length} <span className="text-[10px] text-slate-400">completadas</span></p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Interactive Analysis Section with History */}
            <div className="flex items-center justify-between mb-2 px-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Análisis y Datos</h4>
                <button
                    onClick={() => toggleSection('analysis')}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                >
                    {collapsedSections.analysis ? 'Mostrar' : 'Contraer'}
                </button>
            </div>
            <AnimatePresence initial={false}>
                {!collapsedSections.analysis && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-6 overflow-hidden"
                    >
                        <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col gap-6">
                                <div className="flex items-center justify-between gap-4">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Análisis de Evolución</h3>
                                    <button
                                        onClick={() => setUseSmoothing(!useSmoothing)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black transition-all border ${useSmoothing ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <TrendingUp size={14} />
                                        <span className="hidden sm:inline">{useSmoothing ? 'QUITAR FILTRO' : 'LIMPIAR RUIDO'}</span>
                                    </button>
                                </div>

                                {/* Metric Selectors */}
                                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 rounded-2xl">
                                    {[
                                        { id: 'weight', label: 'Peso', color: '#6366f1' },
                                        { id: 'steps', label: 'Pasos', color: '#10b981' },
                                        ...customMetrics.map(m => ({ id: m, label: m === 'waist' ? 'Cintura' : m === 'hip' ? 'Cadera' : m, color: '#f43f5e' }))
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setActiveMetric(m.id)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all ${activeMetric === m.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                                {m.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="h-[250px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis
                                                dataKey="date"
                                                tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: es })}
                                                stroke="#94a3b8"
                                                fontSize={9}
                                                fontWeight="bold"
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                domain={['auto', 'auto']}
                                                stroke="#94a3b8"
                                                fontSize={9}
                                                fontWeight="bold"
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                                labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '4px', fontSize: '10px' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: '700' }}
                                                labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: es })}
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey={activeMetric === 'weight' ? 'weight' : activeMetric === 'steps' ? 'steps' : `measurements.${activeMetric}`}
                                                stroke={activeMetric === 'weight' ? '#6366f1' : activeMetric === 'steps' ? '#10b981' : '#f43f5e'}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: activeMetric === 'weight' ? '#6366f1' : activeMetric === 'steps' ? '#10b981' : '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* History Table Refactored */}
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Historial de Registros</h3>
                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                    <CalendarDays size={18} />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50/50 text-slate-500 font-black uppercase text-[9px] tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className={`px-6 py-4 transition-colors ${activeMetric === 'weight' ? 'text-indigo-600 bg-indigo-50/30' : ''}`}>Peso</th>
                                            <th className={`px-6 py-4 transition-colors ${activeMetric === 'steps' ? 'text-emerald-600 bg-emerald-50/30' : ''}`}>Pasos</th>
                                            {customMetrics.map(m => (
                                                <th key={m} className={`px-6 py-4 transition-colors ${activeMetric === m ? 'text-rose-500 bg-rose-50/30' : ''}`}>
                                                    {m === 'waist' ? 'Cintura' : m === 'hip' ? 'Cadera' : m}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {[...history].reverse().map((entry) => (
                                            <tr key={entry.date} className="group hover:bg-slate-50/50 transition-all">
                                                <td className="px-6 py-5 text-slate-500 font-bold text-xs uppercase">
                                                    {format(new Date(entry.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                                </td>
                                                <td className={`px-6 py-5 font-black text-sm ${activeMetric === 'weight' ? 'text-indigo-600 bg-indigo-50/10' : 'text-slate-900'}`}>{entry.weight || '-'}</td>
                                                <td className={`px-6 py-5 font-black text-sm ${activeMetric === 'steps' ? 'text-emerald-600 bg-emerald-50/10' : 'text-slate-900'}`}>{entry.steps?.toLocaleString() || '-'}</td>
                                                {customMetrics.map(m => (
                                                    <td key={m} className={`px-6 py-5 font-black text-sm ${activeMetric === m ? 'text-rose-500 bg-rose-50/10' : 'text-slate-900'}`}>{entry.measurements?.[m] || '-'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {history.length === 0 && (
                                            <tr>
                                                <td colSpan={customMetrics.length + 3} className="p-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sin registros</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Visual Evolution Section */}
            <section
                onClick={() => setIsComparingPhotos(true)}
                className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:bg-emerald-500/20 transition-colors duration-500" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="flex-1 space-y-4">
                        <div className="bg-emerald-500 text-slate-900 w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg group-hover:rotate-12 transition-all duration-500">
                            <Camera size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black tracking-tight underline decoration-emerald-500/50 underline-offset-8">Evolución Visual</h3>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed mt-4 max-w-xs">
                                Compara tus cambios físicos y visualiza tu transformación a través de las fotos de progreso.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-[0.2em] mt-2 group-hover:translate-x-2 transition-transform duration-500">
                            Abrir Galería Comparativa <ChevronRight size={18} />
                        </div>
                    </div>
                    {history.filter(e => e.photos && Object.values(e.photos).some(u => u)).length > 0 && (
                        <div className="relative hidden sm:block">
                            <div className="w-32 h-44 rounded-2xl bg-white/10 border-2 border-white/20 rotate-[-12deg] overflow-hidden translate-x-4">
                                <Activity className="w-full h-full p-8 text-white/5" />
                            </div>
                            <div className="absolute top-0 w-32 h-44 rounded-2xl bg-white/5 border-2 border-white/20 rotate-[12deg] overflow-hidden translate-x-12 translate-y-4">
                                <Activity className="w-full h-full p-8 text-white/10" />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Photo Comparison Modal */}
            <AnimatePresence>
                {isComparingPhotos && (
                    <PhotoComparisonModal
                        userId={currentUser.uid}
                        onClose={() => setIsComparingPhotos(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AthleteTracking;
