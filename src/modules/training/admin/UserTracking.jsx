import React, { useEffect, useState } from 'react';
import { TrainingDB } from '../services/db';
import { X, TrendingUp, TrendingDown, Activity, Calendar, Settings, Plus, Trash2, Footprints, Heart, BarChart, Utensils, Info, Edit2, Trophy, CalendarDays, CheckSquare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import AthleteHabits from '../athlete/pages/AthleteHabits';
import UserPlanning from './UserPlanning';
import UserSessionHistory from './UserSessionHistory';

const UserTracking = ({ user, onClose, initialTab = 'metrics' }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(initialTab); // 'metrics' | 'habits' | 'planning' | 'history'
    const [showConfigInline, setShowConfigInline] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [customMetrics, setCustomMetrics] = useState(user.customMeasurements || []);

    const normalizeMinimums = (m) => {
        if (!m) return { nutrition: [], movement: [], health: [], uncategorized: [] };
        if (Array.isArray(m)) return { nutrition: m, movement: [], health: [], uncategorized: [] };
        return {
            nutrition: m.nutrition || [],
            movement: m.movement || [],
            health: m.health || [],
            uncategorized: m.uncategorized || []
        };
    };

    const [minimums, setMinimums] = useState(normalizeMinimums(user.minimums));

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            const data = await TrainingDB.tracking.getHistory(user.id);
            // Reverse for chart (oldest to newest) if getHistory returns newest first
            // My implementation of getHistory returns newest first, so we reverse it for charts
            setHistory(data.reverse());
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

    // Metrics
    const currentWeight = history.length > 0 ? history[history.length - 1].weight : null;
    const startWeight = history.length > 0 ? history[0].weight : null;
    const weightChange = currentWeight && startWeight ? (currentWeight - startWeight).toFixed(1) : 0;

    const avgSteps = history.length > 0
        ? Math.round(history.reduce((acc, curr) => acc + (curr.steps || 0), 0) / history.length)
        : 0;

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header Redesigned */}
            <div className="sticky top-0 z-[70] bg-white border-b border-slate-100 px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
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

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50 pb-20">
                <div className="max-w-6xl mx-auto space-y-8">

                    {activeTab === 'metrics' ? (
                        <>
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Peso Actual</span>
                                        <Activity size={18} className="text-indigo-500" />
                                    </div>
                                    <div className="flex items-end gap-3">
                                        <span className="text-3xl font-black text-slate-900">{currentWeight || '-'} <span className="text-sm text-slate-400 font-medium">kg</span></span>
                                        {weightChange !== 0 && (
                                            <span className={`text-sm font-bold mb-1 flex items-center ${weightChange < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {weightChange < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                                {Math.abs(weightChange)} kg
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Media Pasos</span>
                                        <Activity size={18} className="text-emerald-500" />
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{avgSteps.toLocaleString()} <span className="text-sm text-slate-400 font-medium">pasos/día</span></div>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Check-ins</span>
                                        <Calendar size={18} className="text-orange-500" />
                                    </div>
                                    <div className="text-3xl font-black text-slate-900">{history.length} <span className="text-sm text-slate-400 font-medium">totales</span></div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Weight Chart */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">Evolución Peso</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={history}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: es })}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    domain={['dataMin - 2', 'dataMax + 2']}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: es })}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="weight"
                                                    stroke="#6366f1"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Steps Chart */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-bold text-slate-900 mb-6">Actividad Diaria (Pasos)</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RechartsBarChart data={history}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: es })}
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    stroke="#94a3b8"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#f1f5f9' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                    labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: es })}
                                                />
                                                <Bar
                                                    dataKey="steps"
                                                    fill="#10b981"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            </RechartsBarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Recent History Table */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-900">Historial de Registros</h3>
                                    <button
                                        onClick={() => setShowConfigInline(!showConfigInline)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black transition-all border ${showConfigInline ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                                    >
                                        <Settings size={14} />
                                        {showConfigInline ? 'CERRAR AJUSTES' : 'CONFIGURAR VARIABLES'}
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showConfigInline && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden border-b border-slate-100 bg-slate-50/30"
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
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                            <tr>
                                                <th className="p-4 rounded-tl-2xl">Fecha</th>
                                                <th className="p-4">Peso</th>
                                                {customMetrics.map(m => (
                                                    <th key={m} className="p-4 text-indigo-400 bg-slate-50/50">{m}</th>
                                                ))}
                                                <th className="p-4">Pasos</th>
                                                <th className="p-4">Notas</th>
                                                <th className="p-4 rounded-tr-2xl">Fotos</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {[...history].reverse().map((entry) => (
                                                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 font-bold text-slate-900">
                                                        {format(new Date(entry.date), 'dd MMM yyyy', { locale: es })}
                                                    </td>
                                                    <td className="p-4 font-medium text-indigo-600">
                                                        {entry.weight ? `${entry.weight} kg` : '-'}
                                                    </td>
                                                    {customMetrics.map(m => (
                                                        <td key={m} className="p-4 text-slate-600 font-medium text-xs">
                                                            {entry.measurements && entry.measurements[m]
                                                                ? entry.measurements[m]
                                                                : '-'}
                                                        </td>
                                                    ))}
                                                    <td className="p-4 font-medium text-emerald-600">
                                                        {entry.steps ? entry.steps.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-4 text-slate-500 max-w-xs truncate">
                                                        {entry.notes || '-'}
                                                    </td>
                                                    <td className="p-4">
                                                        {entry.photos ? (
                                                            <div className="flex -space-x-2">
                                                                {Object.values(entry.photos).filter(Boolean).map((url, i) => (
                                                                    <div
                                                                        key={i}
                                                                        onClick={() => setSelectedPhoto(url)}
                                                                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                                                    >
                                                                        <img src={url} alt="Progress" className="w-full h-full object-cover" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                            {history.length === 0 && (
                                                <tr>
                                                    <td colSpan="5" className="p-8 text-center text-slate-400 italic">
                                                        No hay registros disponibles.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
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
        updated[fromCategory] = updated[fromCategory].filter(h => h !== habit);
        // Add to target
        if (!updated[toCategory].includes(habit)) {
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
        if (!confirm(`¿Eliminar el hábito "${habit}"?`)) return;
        const updated = { ...minimums };
        updated[category] = updated[category].filter(h => h !== habit);
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
        if (!updated[category].includes(newValue.trim())) {
            updated[category] = [...updated[category], newValue.trim()];
        }

        setMinimums(updated);
        setNewValue('');
        setAddingToCategory(null);

        try {
            await TrainingDB.users.updateProfile(user.id, { minimums: updated });
        } catch (e) { console.error(e); }
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim() || editValue === editingHabit.original) {
            setEditingHabit(null);
            return;
        }

        const updated = { ...minimums };
        const category = editingHabit.category;
        updated[category] = updated[category].map(h =>
            h === editingHabit.original ? editValue.trim() : h
        );

        setMinimums(updated);
        setEditingHabit(null);

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
                            <div key={habit} className="bg-white border border-amber-200 px-4 py-3 rounded-2xl shadow-sm flex items-center gap-4">
                                <span className="font-bold text-slate-700 text-sm">{habit}</span>
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
                                    <div key={habit} className="group flex items-center justify-between p-3 bg-slate-50/50 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                        {editingHabit?.original === habit && editingHabit?.category === cat.id ? (
                                            <div className="flex-1 flex gap-2">
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
                                            <>
                                                <span className="text-xs font-bold text-slate-700">{habit}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingHabit({ original: habit, category: cat.id });
                                                            setEditValue(habit);
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
                                            </>
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
                                if (entry.habitsResults[h] !== undefined && entry.habitsResults[h] !== null) {
                                    totalChecked++;
                                    if (entry.habitsResults[h] === true) totalDone++;
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
                            {m}
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
