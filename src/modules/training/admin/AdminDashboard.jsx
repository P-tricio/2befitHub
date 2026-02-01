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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
                const users = await TrainingDB.users.getAll();
                setStats(prev => ({
                    ...prev,
                    totalUsers: users.length,
                    unreadMessages: users.reduce((acc, u) => acc + (u.unreadAdmin || 0), 0),
                    pendingForms: users.filter(u => u.unreadAdmin > 0).length
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
        { title: 'Gestión', value: 'Forms', icon: <ClipboardList className="text-violet-500" />, link: '/training/admin/forms', color: 'violet' }
    ];

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Cargando dashboard...</div>;

    return (
        <div className="p-4 max-w-7xl mx-auto space-y-4">
            {/* Simple Header */}
            <header className="flex justify-between items-center px-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Control Hub</h1>
                <div className="flex gap-2">
                    <Link to="/training/admin/activity" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wide hover:bg-emerald-100 transition-all">
                        <Activity size={12} /> {stats.todayActivities} hoy
                    </Link>
                </div>
            </header>

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
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-300 shrink-0">
                                            {format(noti.createdAt, 'HH:mm')}
                                        </span>
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
