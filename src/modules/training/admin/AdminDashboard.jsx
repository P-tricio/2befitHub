import React, { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ClipboardList, Activity, ArrowRight, CheckCircle2, MessageSquare, Clock } from 'lucide-react';
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
        { title: 'Actividad Hoy', value: stats.todayActivities, icon: <Activity className="text-emerald-500" />, link: '#', color: 'emerald' },
        { title: 'Mensajes', value: stats.unreadMessages, icon: <MessageSquare className="text-amber-500" />, link: '/training/admin/users', color: 'amber' },
        { title: 'Gestión', value: 'Forms', icon: <ClipboardList className="text-violet-500" />, link: '/training/admin/forms', color: 'violet' }
    ];

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Cargando dashboard...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:y-10">
            {/* Header */}
            <header className="px-2">
                <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">Control Hub</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1">Resumen de actividad global</p>
            </header>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                {cards.map((card, i) => (
                    <Link
                        key={i}
                        to={card.link}
                        className={`bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group`}
                    >
                        <div className="flex justify-between items-start mb-2 md:mb-4">
                            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-${card.color}-50 flex items-center justify-center transition-transform group-hover:scale-110`}>
                                {React.cloneElement(card.icon, { size: window.innerWidth < 768 ? 16 : 24 })}
                            </div>
                            <ArrowRight size={14} className="text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all hidden md:block" />
                        </div>
                        <p className="text-xl md:text-3xl font-black text-slate-900 leading-none mb-1">{card.value}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.title}</p>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    <div className="flex justify-between items-end px-2">
                        <h2 className="text-lg md:text-xl font-black text-slate-900">Actividad Reciente</h2>
                        <button className="text-[10px] md:text-xs font-bold text-blue-600 hover:underline">Ver todo</button>
                    </div>

                    <div className="bg-white rounded-[1.8rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        {recentNotifications.length === 0 ? (
                            <div className="p-10 md:p-20 text-center text-slate-300 font-bold italic text-sm">
                                No hay actividad reciente registrada
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {recentNotifications.map((noti) => (
                                    <div
                                        key={noti.id}
                                        onClick={() => navigate(`/training/admin/users?athleteId=${noti.athleteId}`)}
                                        className="p-4 md:p-6 flex items-start gap-3 md:gap-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl shrink-0 flex items-center justify-center ${noti.type === 'task_completion' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                                            }`}>
                                            {noti.type === 'task_completion' ? <CheckCircle2 size={window.innerWidth < 768 ? 20 : 24} /> : <Activity size={window.innerWidth < 768 ? 20 : 24} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-black text-slate-900 text-sm md:text-base group-hover:text-blue-600 transition-colors truncate">{noti.athleteName || 'Atleta'}</h3>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase flex items-center gap-1 shrink-0">
                                                    <Clock size={10} />
                                                    {format(noti.createdAt, 'HH:mm', { locale: es })}
                                                </span>
                                            </div>
                                            <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5 line-clamp-1">{noti.message}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar / Shortcuts */}
                <div className="space-y-4 md:space-y-6">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 px-2">Acceso Rápido</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4">
                        <Link
                            to="/training/admin/global-creator"
                            className="p-4 md:p-6 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2rem] hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 group"
                        >
                            <h3 className="font-black text-sm md:text-lg mb-0.5 md:mb-1 flex items-center gap-2">
                                Editor
                                <Activity size={16} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
                            </h3>
                            <p className="text-slate-400 text-[9px] md:text-xs font-medium">Contenido Global</p>
                        </Link>

                        <Link
                            to="/training/admin/programs"
                            className="p-4 md:p-6 bg-blue-600 text-white rounded-[1.5rem] md:rounded-[2rem] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/10 group"
                        >
                            <h3 className="font-black text-sm md:text-lg mb-0.5 md:mb-1 flex items-center gap-2">
                                Programación
                                <ClipboardList size={16} className="text-blue-200 group-hover:-rotate-12 transition-transform" />
                            </h3>
                            <p className="text-blue-200 text-[9px] md:text-xs font-medium">Macro y Micro</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
