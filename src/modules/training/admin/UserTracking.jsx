import React, { useEffect, useState, useRef } from 'react';
import { TrainingDB } from '../services/db';
import { X, TrendingUp, TrendingDown, Activity, Calendar, Settings, Plus, Trash2, Footprints, Heart, BarChart, Utensils, Info, Edit2, Trophy, CalendarDays, CheckSquare, Camera, FileText, ChevronDown, Dumbbell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import AthleteHabits from '../athlete/pages/AthleteHabits';
import UserPlanning from './UserPlanning';
import UserSessionHistory from './UserSessionHistory';
import ExerciseHistoryView from '../athlete/components/ExerciseHistoryView';
import VisualEvolutionCard from '../components/VisualEvolutionCard';

const UserTracking = ({ user, onClose, initialTab = 'metrics' }) => {
    const scrollContainerRef = useRef(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab); // 'metrics' | 'habits' | 'planning' | 'history'
    const [showConfigInline, setShowConfigInline] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [availableForms, setAvailableForms] = useState([]);
    const [formTasks, setFormTasks] = useState([]);
    const [expandedForms, setExpandedForms] = useState({}); // { taskId: boolean }
    const [customMetrics, setCustomMetrics] = useState(user.customMeasurements?.length > 0 ? user.customMeasurements : ['waist', 'hip']);
    const [activeMetric, setActiveMetric] = useState('weight');
    const [useSmoothing, setUseSmoothing] = useState(false);

    const [collapsedSections, setCollapsedSections] = useState({
        kpis: false,
        analysis: false,
        visual: false
    });

    const toggleSection = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const normalizeMinimums = (m) => {
        const defaultStructure = { nutrition: [], movement: [], health: [], uncategorized: [] };
        if (!m) return defaultStructure;

        const raw = Array.isArray(m) ? { nutrition: m, movement: [], health: [], uncategorized: [] } : m;

        // Ensure every habit is an object { name, target }
        const result = { ...defaultStructure };
        Object.keys(result).forEach(key => {
            result[key] = (raw[key] || []).map(h =>
                typeof h === 'string' ? { name: h, target: 7 } : h
            );
        });
        return result;
    };

    const [minimums, setMinimums] = useState(normalizeMinimums(user.minimums));
    const [habitFrequency, setHabitFrequency] = useState(user.habitFrequency || 'daily');

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const [data, forms, userSnap] = await Promise.allSettled([
                TrainingDB.tracking.getHistory(user.id),
                TrainingDB.forms.getAll(),
                TrainingDB.users.getById(user.id)
            ]);

            const historyData = data.status === 'fulfilled' ? data.value : [];
            const formsData = forms.status === 'fulfilled' ? forms.value : [];
            const userData = userSnap.status === 'fulfilled' ? userSnap.value : {};
            const scheduleData = userData?.schedule || {};

            setHistory(Array.isArray(historyData) ? historyData : []);
            setAvailableForms(Array.isArray(formsData) ? formsData : []);

            // Extract all form results from schedule
            const formsFound = [];
            Object.entries(scheduleData || {}).forEach(([date, dayTasks]) => {
                if (Array.isArray(dayTasks)) {
                    dayTasks.forEach(task => {
                        const results = task.results || {};
                        const answers = results.formAnswers || results.answers; // Defensive check
                        if (answers && Object.keys(answers).length > 0) {
                            formsFound.push({ ...task, date, results: { ...results, formAnswers: answers } });
                        }
                    });
                }
            });
            // Sort by date newest first
            setFormTasks(formsFound.sort((a, b) => b.date.localeCompare(a.date)));
        } catch (error) {
            console.error("Error loading tracking data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveMetrics = async (newMetrics) => {
        try {
            await TrainingDB.users.updateCustomMeasurements(user.id, newMetrics);
            setCustomMetrics(newMetrics);
            setShowConfigInline(false);
        } catch (error) {
            console.error(error);
            alert("Error al guardar métricas");
        }
    };

    const handleDeleteEntry = async (date) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar el registro del ${format(new Date(date + 'T12:00:00'), 'dd/MM/yyyy')}? Esta acción no se puede deshacer.`)) return;

        try {
            await TrainingDB.tracking.deleteEntry(user.id, date);
            setHistory(prev => prev.filter(e => e.date !== date));
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el registro");
        }
    };

    // Metrics
    const currentWeight = history.length > 0 ? history[history.length - 1].weight : null;
    const startWeight = history.length > 0 ? history[0].weight : null;
    const weightChange = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : 0;

    const lastEntry = history.length > 0 ? history[history.length - 1] : null;

    const getSmoothedData = (data, metric) => {
        if (!useSmoothing) return data;
        const windowSize = 5;
        const key = metric === 'weight' ? 'weight' : metric === 'steps' ? 'steps' : `measurements.${metric}`;

        return data.map((entry, idx, arr) => {
            const window = arr.slice(Math.max(0, idx - windowSize + 1), idx + 1);
            const values = window.map(e => {
                if (metric === 'weight') return e.weight;
                if (metric === 'steps') return e.steps;
                return e.measurements?.[metric];
            }).filter(v => v !== null && v !== undefined);

            if (values.length === 0) return entry;
            const avg = values.reduce((a, b) => a + b, 0) / values.length;

            // Return a clone with the smoothed value
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

    return (
        <div className="fixed inset-0 w-full h-full z-[100] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Redesigned */}
            <div className="relative z-[110] bg-white border-b border-slate-100 px-4 py-2 shrink-0">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 py-1">
                    {/* Left: Close & Title */}
                    <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 active:scale-95"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">{user.name || user.displayName}</h2>
                        </div>
                    </div>

                    {/* Center: Tabs redesigned with icons - Unified and responsive */}
                    <div className="w-full md:w-auto">
                        <div className="flex bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 gap-0.5 w-full md:w-fit mx-auto md:mx-0">
                            {[
                                { id: 'metrics', icon: <Activity size={18} />, label: 'Métricas' },
                                { id: 'habits', icon: <CheckSquare size={18} />, label: 'Hábitos' },
                                { id: 'forms', icon: <FileText size={18} />, label: 'Cuestionarios' },
                                { id: 'planning', icon: <CalendarDays size={18} />, label: 'Planificación' },
                                { id: 'loads', icon: <Dumbbell size={18} />, label: 'Cargas' },
                                { id: 'history', icon: <Trophy size={18} />, label: 'Historial' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-2.5 md:px-4 py-2.5 rounded-xl text-[10px] font-black transition-all group ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                                    title={tab.label}
                                >
                                    <span className="shrink-0">{tab.icon}</span>
                                    <span className="uppercase tracking-widest hidden md:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Close Spacer (Hidden on mobile to save space) */}
                    <div className="hidden md:block md:w-40" />
                </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 md:p-4 bg-slate-50/50 pb-20">
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {activeTab === 'metrics' ? (
                        <>
                            {/* KPIs Summary Bar */}
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
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl"><Activity size={18} /></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Actual</p>
                                                        <p className="text-xl font-black text-slate-900">{currentWeight || '-'} <span className="text-xs text-slate-400 font-medium">kg</span></p>
                                                    </div>
                                                </div>
                                                {weightChange !== 0 && (
                                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${weightChange < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {weightChange < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                                        {Math.abs(weightChange)} kg
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl"><Footprints size={18} /></div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Último NEAT (Pasos)</p>
                                                    <p className="text-xl font-black text-slate-900">{lastEntry?.steps?.toLocaleString() || '-'} <span className="text-xs text-slate-400 font-medium lowercase">pasos</span></p>
                                                </div>
                                            </div>

                                            <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Settings size={18} /></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Métricas Activas</p>
                                                        <p className="text-xl font-black text-slate-900">{customMetrics.length} <span className="text-xs text-slate-400 font-medium lowercase">perímetros</span></p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setShowConfigInline(!showConfigInline)} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Main Analysis Block (Chart + Legend + Table) */}
                            <div className="space-y-6">
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
                                            {/* Chart Section */}
                                            <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col">
                                                <div className="flex flex-col gap-8 mb-8">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Análisis de Evolución</h3>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecciona una medida para visualizar su historial</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setUseSmoothing(!useSmoothing)}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black transition-all border ${useSmoothing ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                                                title="Limpiar ruido (Media móvil)"
                                                            >
                                                                <TrendingUp size={14} />
                                                                <span className="hidden sm:inline">{useSmoothing ? 'QUITAR FILTRO' : 'LIMPIAR RUIDO'}</span>
                                                            </button>
                                                            <button
                                                                onClick={() => setShowConfigInline(!showConfigInline)}
                                                                className={`flex items-center gap-2 px-5 py-2 rounded-2xl text-[10px] font-black transition-all border ${showConfigInline ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                                            >
                                                                <Settings size={14} />
                                                                <span className="hidden sm:inline">{showConfigInline ? 'CERRAR PANEL' : 'GESTIONAR VARIABLES'}</span>
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Simplified Legend Selector (Interactive) */}
                                                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50/50 rounded-[2rem] border border-slate-100/50">
                                                        {[
                                                            { id: 'weight', label: 'Peso Corporal', color: '#6366f1' },
                                                            { id: 'steps', label: 'NEAT (Pasos)', color: '#10b981' },
                                                            ...customMetrics.map(m => ({ id: m, label: m === 'waist' ? 'Cintura' : m === 'hip' ? 'Cadera' : m, color: '#f43f5e' }))
                                                        ].map(metric => (
                                                            <button
                                                                key={metric.id}
                                                                onClick={() => setActiveMetric(metric.id)}
                                                                className={`px-4 py-2.5 rounded-2xl flex items-center gap-3 transition-all ${activeMetric === metric.id ? 'bg-white shadow-md ring-1 ring-slate-200' : 'hover:bg-white/50 grayscale opacity-60'}`}
                                                            >
                                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: metric.color }} />
                                                                <span className={`text-[11px] font-black uppercase tracking-tight ${activeMetric === metric.id ? 'text-slate-900' : 'text-slate-400'}`}>
                                                                    {metric.label}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <AnimatePresence>
                                                        {showConfigInline && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden border-b border-slate-100 bg-slate-50/30 rounded-3xl"
                                                            >
                                                                <div className="p-8 max-w-md mx-auto">
                                                                    <MetricsConfigInline
                                                                        initialMetrics={customMetrics}
                                                                        onSave={handleSaveMetrics}
                                                                    />
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <div className="h-[400px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={chartData}>
                                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                            <XAxis
                                                                dataKey="date"
                                                                tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: es })}
                                                                stroke="#94a3b8"
                                                                fontSize={10}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                fontWeight="bold"
                                                            />
                                                            <YAxis
                                                                domain={['auto', 'auto']}
                                                                stroke="#94a3b8"
                                                                fontSize={10}
                                                                tickLine={false}
                                                                axisLine={false}
                                                                fontWeight="bold"
                                                            />
                                                            <Tooltip
                                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                                                                labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px', fontSize: '12px' }}
                                                                itemStyle={{ fontSize: '12px', fontWeight: '700' }}
                                                                labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: es })}
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey={activeMetric === 'weight' ? 'weight' : activeMetric === 'steps' ? 'steps' : `measurements.${activeMetric}`}
                                                                stroke={activeMetric === 'weight' ? '#6366f1' : activeMetric === 'steps' ? '#10b981' : '#f43f5e'}
                                                                strokeWidth={4}
                                                                dot={{ r: 6, fill: activeMetric === 'weight' ? '#6366f1' : activeMetric === 'steps' ? '#10b981' : '#f43f5e', strokeWidth: 3, stroke: '#fff' }}
                                                                activeDot={{ r: 8, strokeWidth: 0 }}
                                                                animationDuration={1000}
                                                                connectNulls={true}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                                        <thead className="bg-slate-50/50 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                                            <tr>
                                                                <th className="p-6">Fecha</th>
                                                                <th className={`p-6 cursor-pointer transition-colors ${activeMetric === 'weight' ? 'text-indigo-600 bg-indigo-50/30' : ''}`} onClick={() => setActiveMetric('weight')}>Peso (kg)</th>
                                                                <th className={`p-6 cursor-pointer transition-colors ${activeMetric === 'steps' ? 'text-emerald-600 bg-emerald-50/30' : ''}`} onClick={() => setActiveMetric('steps')}>NEAT (Pasos)</th>
                                                                {customMetrics.map(m => (
                                                                    <th
                                                                        key={m}
                                                                        onClick={() => setActiveMetric(m)}
                                                                        className={`p-6 cursor-pointer transition-colors ${activeMetric === m ? 'text-rose-500 bg-rose-50/30' : ''}`}
                                                                    >
                                                                        {m === 'waist' ? 'Cintura' : m === 'hip' ? 'Cadera' : m} (cm)
                                                                    </th>
                                                                ))}
                                                                <th className="p-6 text-right">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {[...history].reverse()
                                                                .filter(entry => {
                                                                    // Only show entries with numeric data
                                                                    const hasWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '';
                                                                    const hasSteps = entry.steps !== null && entry.steps !== undefined && entry.steps !== '';
                                                                    const hasMeasurements = entry.measurements && Object.values(entry.measurements).some(v => v !== null && v !== undefined && v !== '');
                                                                    return hasWeight || hasSteps || hasMeasurements;
                                                                })
                                                                .map((entry) => (
                                                                    <tr key={entry.date} className="group hover:bg-slate-50/50 transition-all">
                                                                        <td className="p-6 text-slate-500 font-bold text-xs uppercase">
                                                                            {format(new Date(entry.date + 'T12:00:00'), 'dd MMMM yyyy', { locale: es })}
                                                                        </td>
                                                                        <td className={`p-6 font-black text-sm ${activeMetric === 'weight' ? 'text-indigo-600 bg-indigo-50/10' : 'text-slate-900'}`}>
                                                                            {entry.weight || '-'}
                                                                        </td>
                                                                        <td className={`p-6 font-black text-sm ${activeMetric === 'steps' ? 'text-emerald-600 bg-emerald-50/10' : 'text-slate-900'}`}>
                                                                            {entry.steps?.toLocaleString() || '-'}
                                                                        </td>
                                                                        {customMetrics.map(m => (
                                                                            <td key={m} className={`p-6 font-black text-sm ${activeMetric === m ? 'text-rose-500 bg-rose-50/10' : 'text-slate-900'}`}>
                                                                                {entry.measurements?.[m] || '-'}
                                                                            </td>
                                                                        ))}
                                                                        <td className="p-6">
                                                                            <div className="flex items-center justify-end gap-2">
                                                                                <button
                                                                                    onClick={() => handleDeleteEntry(entry.date)}
                                                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                                                >
                                                                                    <Trash2 size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            {history.filter(entry => {
                                                                const hasWeight = entry.weight !== null && entry.weight !== undefined && entry.weight !== '';
                                                                const hasSteps = entry.steps !== null && entry.steps !== undefined && entry.steps !== '';
                                                                const hasMeasurements = entry.measurements && Object.values(entry.measurements).some(v => v !== null && v !== undefined && v !== '');
                                                                return hasWeight || hasSteps || hasMeasurements;
                                                            }).length === 0 && (
                                                                    <tr>
                                                                        <td colSpan={customMetrics.length + 4} className="p-20 text-center">
                                                                            <div className="space-y-4">
                                                                                <Activity size={48} className="mx-auto text-slate-100" />
                                                                                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay registros numéricos aún</p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Visual Evolution Section (Photo Comparison) */}
                            <div className="flex items-center justify-between mb-2 px-2 pt-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evolución Visual</h4>
                                <button
                                    onClick={() => toggleSection('visual')}
                                    className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-widest"
                                >
                                    {collapsedSections.visual ? 'Mostrar' : 'Contraer'}
                                </button>
                            </div>
                            <AnimatePresence initial={false}>
                                {!collapsedSections.visual && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-slate-900 rounded-[3rem] p-0 overflow-hidden shadow-2xl">
                                            <VisualEvolutionCard history={history} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                        </>
                    ) : activeTab === 'habits' ? (
                        <div className="space-y-12">
                            <section>
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-900">Calendario de Cumplimiento</h3>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Vista del Atleta</p>
                                </div>
                                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden max-w-lg mx-auto">
                                    <AthleteHabits userId={user.id} isAdminView={true} key={JSON.stringify(minimums)} />
                                </div>
                            </section>

                            <section>
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-900">Gestión de Hábitos</h3>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Organizar y Editar Mínimos</p>
                                </div>

                                {/* Habit Frequency Selector */}
                                <div className="max-w-md mx-auto mb-10 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                                                <CalendarDays size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">Frecuencia de Registro</h4>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">¿Cómo debe reportar el atleta?</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-50 p-1 rounded-2xl gap-1">
                                        {[
                                            { id: 'daily', label: 'Diario', desc: 'Reporte cada mañana (Reflexión)' },
                                            { id: 'weekly', label: 'Semanal', desc: 'Resumen cada domingo (0-7 días)' }
                                        ].map(freq => (
                                            <button
                                                key={freq.id}
                                                onClick={async () => {
                                                    setHabitFrequency(freq.id);
                                                    try {
                                                        await TrainingDB.users.updateProfile(user.id, { habitFrequency: freq.id });
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert("Error al actualizar frecuencia");
                                                    }
                                                }}
                                                className={`flex-1 p-3 rounded-xl transition-all ${habitFrequency === freq.id ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                <div className="text-xs font-black uppercase tracking-widest">{freq.label}</div>
                                                <div className="text-[8px] font-bold opacity-60 mt-0.5">{freq.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <HabitsManagement
                                    user={user}
                                    minimums={minimums}
                                    setMinimums={setMinimums}
                                    history={history}
                                />
                            </section>
                        </div>
                    ) : activeTab === 'forms' ? (
                        <div className="space-y-6">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-black text-slate-900">Cuestionarios Enviados</h3>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Historial de formularios completados</p>
                            </div>

                            <div className="grid grid-cols-1 gap-4 max-w-4xl mx-auto">
                                {formTasks.length === 0 ? (
                                    <div className="py-20 text-center space-y-4 bg-white rounded-[3rem] border border-dashed border-slate-200">
                                        <FileText size={48} className="mx-auto text-slate-100" />
                                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay formularios completados aún</p>
                                    </div>
                                ) : (
                                    formTasks.map((task, idx) => {
                                        const formDef = availableForms.find(f => f.id === task.config?.formId);
                                        const isExpanded = expandedForms[task.id];
                                        return (
                                            <div key={task.id || idx} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                                                <button
                                                    onClick={() => setExpandedForms(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                                    className="w-full text-left p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-sm ring-1 ring-slate-900/5 transition-transform group-hover:scale-105">
                                                            <FileText size={20} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-900">{formDef?.name || task.title || 'Formulario'}</h4>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                                Completado el {format(new Date(task.date + 'T12:00:00'), 'dd MMMM yyyy', { locale: es })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                        <ChevronDown size={20} />
                                                    </div>
                                                </button>

                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            className="overflow-hidden border-t border-slate-100"
                                                        >
                                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                {Object.entries(task.results.formAnswers).map(([qId, answer]) => {
                                                                    const field = formDef?.fields?.find(f => f.id === qId);
                                                                    const label = field?.label || qId;
                                                                    return (
                                                                        <div key={qId} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white transition-colors">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-relaxed">{label}</p>
                                                                            <p className="text-sm font-black text-slate-800">{answer?.toString() || '-'}</p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'planning' ? (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-4 min-h-[600px]">
                            <UserPlanning user={user} isEmbedded={true} key={`planning-${user.id}`} />
                        </div>
                    ) : activeTab === 'loads' ? (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                            <ExerciseHistoryView userId={user.id} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-4 min-h-[600px]">
                            <UserSessionHistory user={user} isEmbedded={true} key={`history-${user.id}`} />
                        </div>
                    )}
                </div>
            </div >


        </div >
    );
};

const HabitsManagement = ({ user, minimums, setMinimums, history }) => {
    const [editingHabit, setEditingHabit] = useState(null); // {original, category}
    const [editValue, setEditValue] = useState('');
    const [addingToCategory, setAddingToCategory] = useState(null);
    const [newValue, setNewValue] = useState('');

    const handleMoveHabit = async (habit, fromCategory, toCategory) => {
        const updated = { ...minimums };
        // Remove from source
        updated[fromCategory] = updated[fromCategory].filter(h => h.name !== habit.name);
        // Add to target
        if (!updated[toCategory].find(h => h.name === habit.name)) {
            updated[toCategory] = [...updated[toCategory], habit];
        }

        setMinimums(updated);

        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (error) {
            console.error(error);
            alert("Error al actualizar categorías");
        }
    };

    const handleDeleteHabit = async (habit, category) => {
        if (!confirm(`¿Eliminar el hábito "${habit.name}"?`)) return;
        const updated = { ...minimums };
        updated[category] = updated[category].filter(h => h.name !== habit.name);
        setMinimums(updated);
        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (e) { console.error(e); }
    };

    const handleAddHabit = async (category) => {
        if (!newValue.trim()) {
            setAddingToCategory(null);
            return;
        }

        const updated = { ...minimums };
        if (!updated[category].find(h => h.name === newValue.trim())) {
            updated[category] = [...updated[category], { name: newValue.trim(), target: 7 }];
        }

        setMinimums(updated);
        setNewValue('');
        setAddingToCategory(null);

        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (e) { console.error(e); }
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim()) {
            setEditingHabit(null);
            return;
        }

        const updated = { ...minimums };
        const category = editingHabit.category;

        updated[category] = updated[category].map(h =>
            h.name === editingHabit.original.name
                ? { ...h, name: editValue.trim() }
                : h
        );

        setMinimums(updated);
        setEditingHabit(null);

        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (e) { console.error(e); }
    };

    const handleUpdateTarget = async (habit, category, newTarget) => {
        const updated = { ...minimums };
        updated[category] = updated[category].map(h =>
            h.name === habit.name ? { ...h, target: newTarget } : h
        );
        setMinimums(updated);
        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (e) { console.error(e); }
    };

    const categories = [
        { id: 'nutrition', label: 'Alimentación', icon: <Utensils size={16} />, color: 'orange' },
        { id: 'movement', label: 'Movimiento', icon: <Footprints size={16} />, color: 'emerald' },
        { id: 'health', label: 'Salud', icon: <Heart size={16} />, color: 'rose' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Uncategorized / New Habits from User */}
            {minimums.uncategorized.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Info size={20} className="text-amber-500" />
                        <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Pendientes de Organizar</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {minimums.uncategorized.map(habit => (
                            <div key={habit.name} className="bg-white border border-amber-200 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-4">
                                <span className="font-bold text-slate-700 text-sm">{habit.name}</span>
                                <div className="flex gap-1 border-l border-slate-100 pl-4">
                                    {categories.map(cat => {
                                        const colorClasses = {
                                            orange: 'hover:text-orange-500',
                                            emerald: 'hover:text-emerald-500',
                                            rose: 'hover:text-rose-500'
                                        };
                                        return (
                                            <button
                                                key={cat.id}
                                                onClick={() => handleMoveHabit(habit, 'uncategorized', cat.id)}
                                                className={`p-2 rounded-lg hover:bg-slate-50 text-slate-400 ${colorClasses[cat.color]} transition-colors`}
                                                title={`Mover a ${cat.label}`}
                                            >
                                                {cat.icon}
                                            </button>
                                        );
                                    })}
                                    <button onClick={() => handleDeleteHabit(habit, 'uncategorized')} className="p-2 text-slate-300 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Categorized Buckets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        <div className={`p-4 bg-${cat.id === 'nutrition' ? 'orange' : cat.id === 'movement' ? 'emerald' : 'rose'}-50 border-b border-${cat.id === 'nutrition' ? 'orange' : cat.id === 'movement' ? 'emerald' : 'rose'}-100 flex items-center gap-3`}>
                            <div className={`p-2 bg-white rounded-xl text-${cat.id === 'nutrition' ? 'orange' : cat.id === 'movement' ? 'emerald' : 'rose'}-500 shadow-sm`}>
                                {cat.icon}
                            </div>
                            <h3 className={`font-black text-sm uppercase tracking-widest text-${cat.id === 'nutrition' ? 'orange' : cat.id === 'movement' ? 'emerald' : 'rose'}-900`}>{cat.label}</h3>
                        </div>
                        <div className="p-4 flex-1 space-y-2 min-h-[150px]">
                            {minimums[cat.id].length === 0 && addingToCategory !== cat.id ? (
                                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-10">Sin hábitos</p>
                            ) : (
                                minimums[cat.id].map(habit => (
                                    <div key={habit.name} className="group flex flex-col p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 gap-3">
                                        {editingHabit?.original.name === habit.name && editingHabit?.category === cat.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                                                    onBlur={handleSaveEdit}
                                                    className="flex-1 bg-white px-2 py-1 rounded border border-slate-200 text-xs font-bold outline-none"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700">{habit.name}</span>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Meta:</span>
                                                        <select
                                                            value={habit.target || 7}
                                                            onChange={(e) => handleUpdateTarget(habit, cat.id, parseInt(e.target.value))}
                                                            className="bg-transparent text-[10px] font-black text-indigo-600 outline-none cursor-pointer hover:bg-slate-200 rounded px-1"
                                                        >
                                                            {[1, 2, 3, 4, 5, 6, 7].map(n => (
                                                                <option key={n} value={n}>{n} {n === 1 ? 'día' : 'días'}/sem</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingHabit({ original: habit, category: cat.id });
                                                            setEditValue(habit.name);
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-slate-600"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMoveHabit(habit, cat.id, 'uncategorized')}
                                                        className="p-1.5 text-slate-300 hover:text-slate-600"
                                                        title="Desasignar"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteHabit(habit, cat.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}

                            {addingToCategory === cat.id ? (
                                <div className="p-3 bg-white rounded-xl border-2 border-slate-900 shadow-sm">
                                    <input
                                        autoFocus
                                        value={newValue}
                                        onChange={e => setNewValue(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddHabit(cat.id)}
                                        onBlur={() => handleAddHabit(cat.id)}
                                        placeholder="Nuevo hábito..."
                                        className="w-full text-xs font-black outline-none"
                                    />
                                </div>
                            ) : (
                                <button
                                    onClick={() => setAddingToCategory(cat.id)}
                                    className="w-full py-3 rounded-xl border border-dashed border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-slate-900 hover:text-slate-900 transition-all flex items-center justify-center gap-2 mt-2"
                                >
                                    <Plus size={14} />
                                    Añadir Hábito
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats / Compliance Report Preview */}
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <h3 className="text-xl font-black mb-6 relative z-10 flex items-center gap-2">
                    <BarChart size={24} className="text-emerald-400" />
                    Cumplimiento por Categoría
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    {categories.map(cat => {
                        const hábitos = minimums[cat.id];
                        if (hábitos.length === 0) return null;

                        // Calculate compliance from history
                        const last30Entries = history.slice(-30);
                        let totalChecked = 0;
                        let totalDone = 0;

                        last30Entries.forEach(entry => {
                            if (!entry.habitsResults) return;
                            hábitos.forEach(h => {
                                const habitName = typeof h === 'string' ? h : h.name;
                                if (entry.habitsResults[habitName] !== undefined && entry.habitsResults[habitName] !== null) {
                                    totalChecked++;
                                    if (entry.habitsResults[habitName] === true || (typeof entry.habitsResults[habitName] === 'number' && entry.habitsResults[habitName] >= (h.target || 1))) totalDone++;
                                }
                            });
                        });

                        const percent = totalChecked > 0 ? Math.round((totalDone / totalChecked) * 100) : 0;

                        return (
                            <div key={cat.id} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{cat.label}</span>
                                    <span className="text-2xl font-black text-white">{percent}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-${cat.id === 'nutrition' ? 'orange' : cat.id === 'movement' ? 'emerald' : 'rose'}-500 transition-all duration-1000`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                    {totalDone} de {totalChecked} cumplidos (últ. 30 días)
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const MetricsConfigInline = ({ initialMetrics, onSave }) => {
    const [metrics, setMetrics] = useState([...initialMetrics]);
    const [newMetric, setNewMetric] = useState('');

    const handleAdd = () => {
        if (!newMetric.trim() || metrics.includes(newMetric.trim())) return;
        setMetrics([...metrics, newMetric.trim()]);
        setNewMetric('');
    };

    const handleRemove = (m) => {
        setMetrics(metrics.filter(item => item !== m));
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Añadir nueva variable</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ej: Cintura, Muslo..."
                        value={newMetric}
                        onChange={(e) => setNewMetric(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-slate-300 transition-all"
                    />
                    <button
                        onClick={handleAdd}
                        className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        <Plus size={20} />
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                    {metrics.map(m => (
                        <div key={m} className="bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-700 animate-in zoom-in-50 duration-200">
                            {m === 'waist' ? 'Cintura' : m === 'hip' ? 'Cadera' : m}
                            <button onClick={() => handleRemove(m)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                    {metrics.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-4">No hay métricas personalizadas configuradas.</p>
                    )}
                </div>
            </div>

            <button
                onClick={() => onSave(metrics)}
                className="w-full py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all mt-4"
            >
                GUARDAR CONFIGURACIÓN
            </button>
        </div>
    );
};

export default UserTracking;
