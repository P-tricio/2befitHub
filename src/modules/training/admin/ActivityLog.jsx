import React, { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    CheckCircle2,
    Clock,
    Search,
    Filter,
    AlertCircle,
    ChevronRight,
    ArrowLeft,
    Calendar,
    User,
    BarChart3,
    Notebook,
    SquareCheck,
    Dumbbell,
    Check
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ActivityLog = () => {
    const [notifications, setNotifications] = useState([]);
    const [filteredNotifications, setFilteredNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const navigate = useNavigate();

    const highPriorityCount = notifications.filter(n => n.priority === 'high' && !n.read).length;

    useEffect(() => {
        const unsub = TrainingDB.notifications.listen('admin', (data) => {
            setNotifications(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        let result = notifications;

        if (searchTerm) {
            result = result.filter(n =>
                n.athleteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                n.message?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterType !== 'all') {
            result = result.filter(n => {
                // Map legacy and granular types to the selected category
                const typeToVerify = n.type === 'task_completion' ? (n.data?.type || 'session') : n.type;

                if (filterType === 'session') return ['session', 'free_training', 'neat'].includes(typeToVerify);
                if (filterType === 'tracking') return ['tracking', 'checkin'].includes(typeToVerify);
                if (filterType === 'form') return ['form', 'form_submission'].includes(typeToVerify);
                if (filterType === 'habit') return ['habit', 'nutrition'].includes(typeToVerify);

                return typeToVerify === filterType;
            });
        }

        if (filterPriority === 'high') {
            result = result.filter(n => n.priority === 'high');
        }

        setFilteredNotifications(result);
    }, [notifications, searchTerm, filterType, filterPriority]);

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Cargando registro de actividad...</div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                <div>
                    <button
                        onClick={() => navigate('/training/admin')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-2 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-xs font-bold uppercase tracking-widest">Volver</span>
                    </button>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <Activity className="text-emerald-500" />
                        Registro de Actividad
                    </h1>
                </div>
            </header>

            {/* Filters Bar */}
            <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex-1 relative w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por atleta o mensaje..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <select
                            className="flex-1 md:flex-none bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-black text-slate-600 focus:outline-none appearance-none"
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">Categorías</option>
                            <option value="session">Sesiones</option>
                            <option value="tracking">Seguimientos</option>
                            <option value="form">Formularios</option>
                            <option value="habit">Hábitos</option>
                        </select>

                        <div className="flex bg-slate-100 p-1 rounded-[1.5rem] border border-slate-200/50 shadow-inner h-fit">
                            <button
                                onClick={() => setFilterPriority('all')}
                                className={`px-4 py-2 rounded-[1.1rem] text-[10px] md:text-xs font-black transition-all ${filterPriority === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Todo
                            </button>
                            <button
                                onClick={() => setFilterPriority('high')}
                                className={`px-4 py-2 rounded-[1.1rem] text-[10px] md:text-xs font-black transition-all flex items-center gap-2 relative ${filterPriority === 'high' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <AlertCircle size={14} className={filterPriority === 'high' ? "text-white" : "text-orange-500"} />
                                <span className="hidden md:inline">Ajustes PDP</span>
                                <span className="md:hidden">Ajustes</span>

                                {highPriorityCount > 0 && filterPriority !== 'high' && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] flex items-center justify-center rounded-full border-2 border-white animate-pulse">
                                        {highPriorityCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                {filteredNotifications.length === 0 ? (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <Search size={32} />
                        </div>
                        <p className="text-slate-400 font-bold italic text-sm">No se encontraron resultados para tus filtros</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filteredNotifications.map((noti) => {
                            // Map legacy and granular types for the icon style
                            const actualType = noti.type === 'task_completion' ? (noti.data?.type || 'session') : noti.type;

                            const getStyle = (type, priority) => {
                                if (priority === 'high') return { bg: 'bg-orange-50', text: 'text-orange-500', icon: <AlertCircle size={24} /> };
                                switch (type) {
                                    case 'session':
                                    case 'free_training':
                                    case 'neat':
                                        return { bg: 'bg-emerald-50', text: 'text-emerald-500', icon: <Dumbbell size={24} /> };
                                    case 'tracking':
                                    case 'checkin':
                                        return { bg: 'bg-blue-50', text: 'text-blue-500', icon: <BarChart3 size={24} /> };
                                    case 'form':
                                    case 'form_submission':
                                        return { bg: 'bg-purple-50', text: 'text-purple-500', icon: <Notebook size={24} /> };
                                    case 'habit':
                                    case 'nutrition':
                                        return { bg: 'bg-amber-50', text: 'text-amber-500', icon: <SquareCheck size={24} /> };
                                    default: return { bg: 'bg-slate-50', text: 'text-slate-500', icon: <Activity size={24} /> };
                                }
                            };
                            const style = getStyle(actualType, noti.priority);

                            return (
                                <div
                                    key={noti.id}
                                    onClick={() => navigate(`/training/admin/users?athleteId=${noti.athleteId}`)}
                                    className="p-4 md:p-6 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center relative ${style.bg} ${style.text}`}>
                                        {style.icon}
                                        {noti.priority === 'high' && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white border-2 border-white">
                                                <AlertCircle size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {noti.athleteName || 'Atleta'}
                                                </h3>
                                                {noti.priority === 'high' && (
                                                    <span className="bg-orange-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-tighter">
                                                        Ajuste PDP
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase flex items-center gap-1 shrink-0">
                                                <Clock size={12} />
                                                {format(noti.createdAt, "d MMM, HH:mm", { locale: es })}
                                            </span>
                                        </div>

                                        <p className="text-sm font-medium text-slate-500 line-clamp-1">
                                            {noti.message}
                                        </p>
                                    </div>
                                    {noti.priority === 'high' && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                TrainingDB.notifications.markAsRead(noti.id);
                                            }}
                                            className={`p-2.5 rounded-xl transition-all shrink-0 self-center z-10 active:scale-90 ${noti.read ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                                            title={noti.read ? 'Ya visto' : 'Marcar como visto'}
                                        >
                                            <Check size={18} strokeWidth={3} />
                                        </button>
                                    )}
                                    <ChevronRight className="text-slate-200 group-hover:text-slate-400 transition-colors self-center shrink-0" size={20} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;
