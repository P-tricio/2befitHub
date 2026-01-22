import React, { useEffect, useState } from 'react';
import { TrainingDB } from '../services/db';
import { X, TrendingUp, TrendingDown, Activity, Calendar, Settings, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const UserTracking = ({ user, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [customMetrics, setCustomMetrics] = useState(user.customMeasurements || []);

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
            setShowConfig(false);
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">{user.displayName}</h2>
                        <p className="text-xs text-slate-500">Seguimiento y Progreso</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(true)}
                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                >
                    <Settings size={18} />
                    <span>Configurar</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
                <div className="max-w-6xl mx-auto space-y-8">

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
                                    <BarChart data={history}>
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
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Recent History Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Historial de Registros</h3>
                        </div>
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
                                                {entry.photos && entry.photos.length > 0 ? (
                                                    <div className="flex -space-x-2">
                                                        {entry.photos.map((url, i) => (
                                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
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

                </div>
            </div>

            {showConfig && (
                <MetricsConfigModal
                    initialMetrics={customMetrics}
                    onSave={handleSaveMetrics}
                    onClose={() => setShowConfig(false)}
                />
            )}
        </div>
    );
};

const MetricsConfigModal = ({ initialMetrics, onSave, onClose }) => {
    const [metrics, setMetrics] = useState(initialMetrics || []);
    const [newMetric, setNewMetric] = useState('');

    const handleAdd = () => {
        if (newMetric.trim() && !metrics.includes(newMetric.trim())) {
            setMetrics([...metrics, newMetric.trim()]);
            setNewMetric('');
        }
    };

    const handleRemove = (metric) => {
        setMetrics(metrics.filter(m => m !== metric));
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md z-[80] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Configurar Métricas</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Añadir Métrica</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMetric}
                                onChange={(e) => setNewMetric(e.target.value)}
                                placeholder="Ej: Bíceps, % Grasa..."
                                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            />
                            <button
                                onClick={handleAdd}
                                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-bold text-slate-400 uppercase">Métricas Activas</label>
                            <span className="text-[10px] text-slate-400 font-medium">{metrics.length} definidas</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2 min-h-[100px] border border-slate-100 flex flex-wrap content-start gap-2">
                            {metrics.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs py-8">
                                    Sin métricas personalizadas
                                </div>
                            ) : (
                                metrics.map(metric => (
                                    <span key={metric} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm">
                                        {metric}
                                        <button onClick={() => handleRemove(metric)} className="text-slate-400 hover:text-red-500 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => onSave(metrics)}
                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                    >
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserTracking;
