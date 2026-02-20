import React, { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import {
    Users,
    ClipboardList,
    Activity,
    ArrowRight,
    CheckCircle2,
    MessageSquare,
    Clock,
    Dumbbell,
    BarChart3,
    Notebook,
    SquareCheck,
    AlertCircle,
    Utensils
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ensureDate } from '../../../lib/dateUtils';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        pendingForms: 0,
        todayActivities: 0,
        unreadMessages: 0
    });
    const [recentNotifications, setRecentNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const metrics = await TrainingDB.admin.getBatchAthleteMetrics();
                const red = metrics.filter(m => m.alertLevel === 'red').length;
                const yellow = metrics.filter(m => m.alertLevel === 'yellow').length;

                setStats(prev => ({
                    ...prev,
                    totalUsers: metrics.length,
                    unreadMessages: metrics.reduce((acc, u) => acc + (u.unreadAdmin || 0), 0),
                    red,
                    yellow
                }));
            } catch (err) { console.error(err); }
        };
        loadUsers();

        const today = format(new Date(), 'yyyy-MM-dd');
        const unsub = TrainingDB.notifications.listen('admin', (data) => {
            setRecentNotifications(data.slice(0, 10));
            setStats(prev => ({
                ...prev,
                todayActivities: data.filter(n =>
                    format(n.createdAt, 'yyyy-MM-dd') === today
                ).length
            }));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const cards = [
        { title: 'Atletas', value: stats.totalUsers, icon: <Users className="text-blue-500" />, link: '/training/admin/users', color: 'blue' },
        { title: 'Actividad Hoy', value: stats.todayActivities, icon: <Activity className="text-emerald-500" />, link: '/training/admin/activity', color: 'emerald' },
        { title: 'Mensajes', value: stats.unreadMessages, icon: <MessageSquare className="text-amber-500" />, link: '/training/admin/users', color: 'amber' },
        { title: 'Nutrición', value: 'Dietas', icon: <Utensils className="text-orange-500" />, link: '/training/admin/nutrition/plans', color: 'orange' },
        { title: 'Auditoría', value: stats.red + stats.yellow, icon: <AlertCircle className="text-rose-500" />, link: '/training/admin/audit', color: 'rose' },
        { title: 'Gestión', value: 'Forms', icon: <ClipboardList className="text-violet-500" />, link: '/training/admin/forms', color: 'violet' }
    ];

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Cargando dashboard...</div>;

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-8">
            {/* Simple Header */}
            <header className="flex justify-between items-center px-2">
                <div className="flex flex-col">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Control Hub</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestión de Rendimiento</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/training/admin/activity" className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-wide hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm">
                        <Activity size={14} /> {stats.todayActivities} hoy
                    </Link>
                </div>
            </header>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {cards.map((card, i) => (
                    <Link
                        key={i}
                        to={card.link}
                        className="group bg-white p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all flex flex-col items-center text-center gap-3 relative overflow-hidden"
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-5 group-hover:scale-150 transition-transform ${card.color === 'blue' ? 'bg-blue-500' :
                                card.color === 'emerald' ? 'bg-emerald-500' :
                                    card.color === 'amber' ? 'bg-amber-500' :
                                        card.color === 'orange' ? 'bg-orange-500' :
                                            card.color === 'rose' ? 'bg-rose-500' : 'bg-violet-500'
                            }`} />

                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
                            {card.icon}
                        </div>
                        <div>
                            <div className="text-xl font-black text-slate-900">{card.value}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Recent Activity Feed - Full Width */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Actividad Reciente</h2>
                    <button
                        onClick={() => navigate('/training/admin/activity')}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                    >
                        Ver todo
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {recentNotifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-300 font-bold italic text-sm">
                            No hay actividad reciente registrada
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {recentNotifications.map((noti) => {
                                const actualType = noti.type === 'task_completion' ? (noti.data?.type || 'session') : noti.type;

                                const getStyle = (type, priority) => {
                                    if (priority === 'high') return { bg: 'bg-orange-50', text: 'text-orange-500', icon: <AlertCircle size={16} /> };
                                    switch (type) {
                                        case 'session':
                                        case 'free_training':
                                        case 'neat':
                                            return { bg: 'bg-emerald-50', text: 'text-emerald-500', icon: <Dumbbell size={16} /> };
                                        case 'tracking':
                                        case 'checkin':
                                            return { bg: 'bg-blue-50', text: 'text-blue-500', icon: <BarChart3 size={16} /> };
                                        case 'form':
                                        case 'form_submission':
                                            return { bg: 'bg-purple-50', text: 'text-purple-500', icon: <Notebook size={16} /> };
                                        case 'habit':
                                        case 'nutrition':
                                        case 'nutrition_day':
                                            return { bg: 'bg-amber-50', text: 'text-amber-500', icon: <SquareCheck size={16} /> };
                                        case 'new_user':
                                            return { bg: 'bg-indigo-50', text: 'text-indigo-500', icon: <Users size={16} /> };
                                        default: return { bg: 'bg-slate-50', text: 'text-slate-500', icon: <Activity size={16} /> };
                                    }
                                };
                                const style = getStyle(actualType, noti.priority);

                                return (
                                    <div
                                        key={noti.id}
                                        onClick={() => navigate(`/training/admin/users?athleteId=${noti.athleteId}`)}
                                        className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${style.bg} ${style.text}`}>
                                            {style.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                                                {noti.athleteName || noti.title || 'Atleta'}
                                            </h3>
                                            <p className="text-xs text-slate-400 truncate">{noti.message}</p>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">
                                                {formatDistanceToNow(ensureDate(noti.createdAt), { addSuffix: false, locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
