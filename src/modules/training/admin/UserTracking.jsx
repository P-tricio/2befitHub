import React, { useEffect, useState, useRef } from 'react';
import { TrainingDB } from '../services/db';
import { X, TrendingUp, TrendingDown, Activity, Calendar, Settings, Plus, Trash2, Footprints, Heart, BarChart, Utensils, Info, Edit2, Trophy, CalendarDays, CheckSquare, Camera } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import AthleteHabits from '../athlete/pages/AthleteHabits';
import UserPlanning from './UserPlanning';
import UserSessionHistory from './UserSessionHistory';

const UserTracking = ({ user, onClose, initialTab = 'metrics' }) => {
    const scrollContainerRef = useRef(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab); // 'metrics' | 'habits' | 'planning' | 'history'
    const [showConfigInline, setShowConfigInline] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [customMetrics, setCustomMetrics] = useState(user.customMeasurements?.length > 0 ? user.customMeasurements : ['waist', 'hip']);
    const [activeMetric, setActiveMetric] = useState('weight');
    const [useSmoothing, setUseSmoothing] = useState(false);
    const [compareDate1, setCompareDate1] = useState(null);
    const [compareDate2, setCompareDate2] = useState(null);
    const [compareView, setCompareView] = useState('front');

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
        try {
            const data = await TrainingDB.tracking.getHistory(user.id);
            // TrainingDB.tracking.getHistory already returns chronological [Oldest -> Newest]
            setHistory(data);
        } catch (error) {
            console.error(error);
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
    const photoEntries = history.filter(e => e.photos && Object.values(e.photos).some(u => u));

    useEffect(() => {
        if (photoEntries.length >= 2) {
            setCompareDate1(photoEntries[photoEntries.length - 1].date);
            setCompareDate2(photoEntries[photoEntries.length - 2].date);
        } else if (photoEntries.length === 1) {
            setCompareDate1(photoEntries[0].date);
        }
    }, [history]);

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
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Redesigned */}
            <div className="sticky top-0 z-[70] bg-white border-b border-slate-100 px-4 py-2">
                <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
                    {/* Left: Close & Title */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-900 active:scale-95"
                        >
                            <X size={20} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">{user.name || user.displayName}</h2>
                        </div>
                    </div>

                    {/* Center: Tabs redesigned with icons */}
                    <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 gap-1">
                        {[
                            { id: 'metrics', icon: <Activity size={18} />, label: 'Métricas' },
                            { id: 'habits', icon: <CheckSquare size={18} />, label: 'Hábitos' },
                            { id: 'planning', icon: <CalendarDays size={18} />, label: 'Planificación' },
                            { id: 'history', icon: <Trophy size={18} />, label: 'Historial' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all group ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'}`}
                                title={tab.label}
                            >
                                {tab.icon}
                                <span className="hidden lg:inline uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Right: Close Spacer */}
                    <div className="w-10 md:w-40" />
                </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 md:p-4 bg-slate-50/50 pb-20">
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {activeTab === 'metrics' ? (
                        <>
                            {/* KPIs Summary Bar */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                            {/* Main Analysis Block (Chart + Legend + Table) */}
                            <div className="space-y-6">
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
                                                {[...history].reverse().map((entry) => (
                                                    <tr key={entry.date} className="group hover:bg-slate-50/50 transition-all">
                                                        <td className="p-6 text-slate-500 font-bold text-xs uppercase">
                                                            {format(new Date(entry.date), 'dd MMMM yyyy', { locale: es })}
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
                                                {history.length === 0 && (
                                                    <tr>
                                                        <td colSpan={customMetrics.length + 4} className="p-20 text-center">
                                                            <div className="space-y-4">
                                                                <Activity size={48} className="mx-auto text-slate-100" />
                                                                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay registros aún</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Visual Evolution Section (Photo Comparison) */}
                            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                                <div className="relative z-10 space-y-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h3 className="text-2xl font-black tracking-tight">Evolución Visual</h3>
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Comparativa físico</p>
                                        </div>
                                        <div className="flex bg-white/10 p-1 rounded-2xl gap-1 w-full md:w-auto overflow-x-auto">
                                            {['front', 'side', 'back'].map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => setCompareView(v)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${compareView === v ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                                >
                                                    {v === 'front' ? 'Frente' : v === 'side' ? 'Perfil' : 'Espalda'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {photoEntries.length >= 1 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {/* Comparison Main Area */}
                                            <div className="flex gap-4 min-h-[400px]">
                                                {[compareDate1, compareDate2].map((date, idx) => {
                                                    const entry = history.find(e => e.date === date);
                                                    const photo = entry?.photos?.[compareView];
                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col gap-4">
                                                            <div className="flex flex-col items-center">
                                                                <select
                                                                    value={date || ''}
                                                                    onChange={e => idx === 0 ? setCompareDate1(e.target.value) : setCompareDate2(e.target.value)}
                                                                    className="bg-white/10 text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest border border-white/20 outline-none hover:bg-white/20 transition-all cursor-pointer"
                                                                >
                                                                    {photoEntries.map(e => (
                                                                        <option key={e.date} value={e.date} className="bg-slate-800">{format(new Date(e.date + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <div
                                                                onClick={() => photo && setSelectedPhoto(photo)}
                                                                className="flex-1 rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 relative group cursor-pointer shadow-inner"
                                                            >
                                                                {photo ? (
                                                                    <img src={photo} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={`Progreso ${idx}`} />
                                                                ) : (
                                                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-3">
                                                                        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center"><Camera size={32} /></div>
                                                                        <span className="text-[10px] font-black uppercase tracking-widest">Sin foto</span>
                                                                    </div>
                                                                )}
                                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Photo History Timeline */}
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Historial de Galería</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {[...photoEntries].reverse().slice(0, 9).map((entry, idx) => (
                                                        <button
                                                            key={entry.date}
                                                            onClick={() => {
                                                                setCompareDate1(entry.date);
                                                                // Optionally set date2 to the previous one
                                                            }}
                                                            className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all relative group"
                                                        >
                                                            <img src={entry.photos.front || entry.photos.side || entry.photos.back} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Thumb" />
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                                                <span className="text-[8px] font-black">{format(new Date(entry.date + 'T12:00:00'), 'dd MMM', { locale: es })}</span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                                {photoEntries.length > 9 && (
                                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">Y {photoEntries.length - 9} registros más...</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-20 text-center space-y-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                            <Camera size={48} className="mx-auto text-white/20" />
                                            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Aún no hay fotos de progreso</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </>
                    ) : activeTab === 'habits' ? (
                        <div className="space-y-12">
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

                            <section>
                                <div className="text-center mb-8">
                                    <h3 className="text-2xl font-black text-slate-900">Calendario de Cumplimiento</h3>
                                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Vista del Atleta</p>
                                </div>
                                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden max-w-lg mx-auto">
                                    <AthleteHabits userId={user.id} isAdminView={true} key={JSON.stringify(minimums)} />
                                </div>
                            </section>
                        </div>
                    ) : activeTab === 'planning' ? (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-4 min-h-[600px]">
                            <UserPlanning user={user} isEmbedded={true} key={`planning-${user.id}`} />
                        </div>
                    ) : (
                        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden p-4 min-h-[600px]">
                            <UserSessionHistory user={user} isEmbedded={true} key={`history-${user.id}`} />
                        </div>
                    )}
                </div>
            </div>

            {
                selectedPhoto && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
                        <div className="relative max-w-4xl w-full h-[80vh] flex items-center justify-center">
                            <img src={selectedPhoto} alt="Full Progress" className="max-w-full max-h-full object-contain rounded-lg" />
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

const HabitsManagement = ({ user, minimums, setMinimums, history }) => {
    const [editingHabit, setEditingHabit] = useState(null); // { original, category }
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
        { id: 'nutrition', label: 'Nutrición', icon: <Utensils size={16} />, color: 'orange' },
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
