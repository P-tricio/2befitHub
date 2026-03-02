import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingDB } from '../services/db';
import {
    Users,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    Search,
    Filter,
    MessageSquare,
    Activity,
    TrendingUp,
    TrendingDown,
    Calendar,
    ArrowLeft,
    Monitor,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { es } from 'date-fns/locale';
import { ensureDate, formatDistanceToNowSafe } from '../../../lib/dateUtils';
import UserTracking from './UserTracking';

const CoachDashboard = () => {
    const [athletes, setAthletes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // 'all' | 'red' | 'yellow' | 'green'
    const [selectedUser, setSelectedUser] = useState(null);
    const [availableForms, setAvailableForms] = useState([]);
    const [wellnessDetailAthlete, setWellnessDetailAthlete] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const [data, forms] = await Promise.all([
                TrainingDB.admin.getBatchAthleteMetrics(),
                TrainingDB.forms.getAll()
            ]);
            setAvailableForms(forms);
            // Sort by priority (Red first, then Yellow, then Green)
            const sorted = data.sort((a, b) => {
                const priority = { red: 0, yellow: 1, green: 2 };
                if (priority[a.alertLevel] !== priority[b.alertLevel]) {
                    return priority[a.alertLevel] - priority[b.alertLevel];
                }
                return (b.unreadAdmin || 0) - (a.unreadAdmin || 0);
            });
            setAthletes(sorted);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAthletes = athletes.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || a.alertLevel === filter;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: athletes.length,
        red: athletes.filter(a => a.alertLevel === 'red').length,
        yellow: athletes.filter(a => a.alertLevel === 'yellow').length,
        green: athletes.filter(a => a.alertLevel === 'green').length
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Escaneando Atletas...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/training/admin')}
                                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit de Clientes</h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel de Control Prioritario</p>
                            </div>
                        </div>

                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-slate-600 focus:ring-2 ring-indigo-500/20 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="Total Clientes" value={stats.total} icon={<Users />} color="slate" active={filter === 'all'} onClick={() => setFilter('all')} />
                    <StatCard label="Atención (Rojo)" value={stats.red} icon={<AlertCircle />} color="rose" active={filter === 'red'} onClick={() => setFilter('red')} />
                    <StatCard label="Monitor (Amarillo)" value={stats.yellow} icon={<Clock />} color="amber" active={filter === 'yellow'} onClick={() => setFilter('yellow')} />
                    <StatCard label="Ok (Verde)" value={stats.green} icon={<CheckCircle2 />} color="emerald" active={filter === 'green'} onClick={() => setFilter('green')} />
                </div>

                {/* Athlete Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode='popLayout'>
                        {filteredAthletes.map((athlete) => (
                            <AthleteAlertCard
                                key={athlete.id}
                                athlete={athlete}
                                availableForms={availableForms}
                                onClick={() => setSelectedUser(athlete)}
                                onShowWellness={() => setWellnessDetailAthlete(athlete)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {filteredAthletes.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <Monitor size={48} className="mx-auto text-slate-200" />
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay atletas en esta categoría</p>
                    </div>
                )}
            </div>

            {/* User Tracking Modal */}
            {selectedUser && (
                <UserTracking
                    user={selectedUser}
                    onClose={() => {
                        setSelectedUser(null);
                        loadMetrics(); // Refresh after closing in case changes were made
                    }}
                />
            )}

            {/* Wellness Detail Modal */}
            <AnimatePresence>
                {wellnessDetailAthlete && (
                    <WellnessDetailModal
                        athlete={wellnessDetailAthlete}
                        availableForms={availableForms}
                        onClose={() => setWellnessDetailAthlete(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard = ({ label, value, icon, color, active, onClick }) => {
    const colors = {
        slate: 'bg-slate-900 border-slate-900 text-white',
        rose: 'bg-rose-500 border-rose-500 text-white',
        amber: 'bg-amber-400 border-amber-400 text-slate-900',
        emerald: 'bg-emerald-500 border-emerald-500 text-white'
    };

    const inactiveColors = {
        slate: 'bg-white border-slate-100 text-slate-400 hover:border-slate-300',
        rose: 'bg-white border-rose-100 text-rose-400 hover:border-rose-300',
        amber: 'bg-white border-amber-100 text-amber-500 hover:border-amber-300',
        emerald: 'bg-white border-emerald-100 text-emerald-500 hover:border-emerald-300'
    };

    return (
        <button
            onClick={onClick}
            className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center gap-2 text-center ${active ? colors[color] : inactiveColors[color]}`}
        >
            <div className="text-xl md:text-3xl font-black">{value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                {icon} {label}
            </div>
        </button>
    );
};

const AthleteAlertCard = ({ athlete, availableForms = [], onClick, onShowWellness }) => {
    const levels = {
        red: { bg: 'bg-rose-50 border-rose-100', text: 'text-rose-600', badge: 'En Riesgo', icon: <AlertCircle size={14} /> },
        yellow: { bg: 'bg-amber-50 border-amber-100', text: 'text-amber-600', badge: 'Seguimiento', icon: <Clock size={14} /> },
        green: { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600', badge: 'Al día', icon: <CheckCircle2 size={14} /> }
    };

    const status = levels[athlete.alertLevel];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={onClick}
            className={`cursor-pointer group relative bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col gap-6 overflow-hidden`}
        >
            {/* Status Stripe */}
            <div className={`absolute top-0 left-0 w-full h-2 ${athlete.alertLevel === 'red' ? 'bg-rose-500' : athlete.alertLevel === 'yellow' ? 'bg-amber-400' : 'bg-emerald-500'}`} />

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-[2rem] bg-slate-50 flex items-center justify-center text-2xl font-black text-slate-300 border-2 border-white overflow-hidden shadow-inner group-hover:scale-110 transition-transform">
                        {athlete.photoURL ? (
                            <img src={athlete.photoURL} alt={athlete.name} className="w-full h-full object-cover" />
                        ) : (
                            athlete.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{athlete.name}</h3>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase mt-1 ${status.bg} ${status.text}`}>
                            {status.icon} {status.badge}
                        </div>
                    </div>
                </div>

                {athlete.unreadAdmin > 0 && (
                    <div className="bg-indigo-600 text-white w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-indigo-600/30 animate-bounce">
                        {athlete.unreadAdmin}
                    </div>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-3xl flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesiones Falladas</span>
                    <span className={`text-lg font-black ${athlete.missedSessions > 0 ? 'text-rose-500' : 'text-slate-900'}`}>{athlete.missedSessions}</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sesiones OK</span>
                    <span className="text-lg font-black text-emerald-500">{athlete.completedSessions}</span>
                </div>
            </div>

            {/* Wellness Peeker */}
            <div
                className="pt-2"
                onClick={(e) => {
                    e.stopPropagation();
                    onShowWellness();
                }}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Activity size={14} className="text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escalas de Bienestar</span>
                    </div>
                    <ChevronRight size={12} className="text-slate-300" />
                </div>
                <div className="flex flex-wrap gap-2">
                    {Object.keys(athlete.wellnessMetrics).length > 0 ? (
                        Object.entries(athlete.wellnessMetrics).slice(0, 4).map(([key, val]) => {
                            // Try to find label in forms
                            let label = key;
                            availableForms.forEach(f => {
                                const field = f.fields?.find(field => field.id === key);
                                if (field) label = field.label;
                            });

                            const isScale = val <= 10; // Simple heuristic for 0-10 scales
                            const colorClass = !isScale ? 'text-indigo-600' :
                                val >= 8 ? 'text-emerald-600' :
                                    val >= 4 ? 'text-amber-500' : 'text-rose-600';

                            return (
                                <div key={key} className="px-3 py-1.5 bg-indigo-50 rounded-xl flex items-center gap-2 border border-indigo-100">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter max-w-[60px] truncate" title={label}>
                                        {label}
                                    </span>
                                    <span className={`text-xs font-black ${colorClass}`}>{val}</span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-[10px] italic text-slate-300">No hay datos recientes de formularios</p>
                    )}
                </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                    <Clock size={12} />
                    Activo: {athlete.lastActivity ? formatDistanceToNowSafe(athlete.lastActivity, { addSuffix: true }) : 'Nunca'}
                </div>
                <div className="p-2 bg-slate-50 text-slate-300 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ChevronRight size={18} />
                </div>
            </div>
        </motion.div>
    );
};

const WellnessDetailModal = ({ athlete, availableForms, onClose }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 pb-4 border-b border-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 leading-tight">Detalle de Bienestar</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{athlete.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4">
                    {Object.keys(athlete.wellnessMetrics).length > 0 ? (
                        Object.entries(athlete.wellnessMetrics).map(([key, val]) => {
                            // Try to find label in forms
                            let label = key;
                            let formName = '';
                            availableForms.forEach(f => {
                                const field = f.fields?.find(field => field.id === key);
                                if (field) {
                                    label = field.label;
                                    formName = f.name;
                                }
                            });

                            const isScale = val <= 10;
                            const colorClass = !isScale ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                val >= 8 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                    val >= 4 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100';

                            return (
                                <div key={key} className="p-4 rounded-2xl border border-slate-50 bg-slate-50/50 space-y-2">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex flex-col gap-1">
                                            {formName && (
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">
                                                    {formName}
                                                </span>
                                            )}
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed">
                                                {label}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-xl border font-black text-sm whitespace-nowrap ${colorClass}`}>
                                            {val}
                                        </div>
                                    </div>
                                    {isScale && (
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${val >= 8 ? 'bg-emerald-500' : val >= 4 ? 'bg-amber-400' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${(val / 10) * 100}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-10 text-center space-y-2">
                            <Activity size={32} className="mx-auto text-slate-100" />
                            <p className="text-sm font-bold text-slate-300">No hay métricas registradas</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-4">
                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CoachDashboard;
