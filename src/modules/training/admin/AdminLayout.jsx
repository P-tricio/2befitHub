import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Dumbbell, Layers, Calendar, ClipboardList, ArrowLeft, Users, LogOut, Sparkles, MessageCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import AdminChatManager from './components/AdminChatManager';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

const AdminLayout = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [isMobileLandscape, setIsMobileLandscape] = React.useState(false);
    const [isChatOpen, setIsChatOpen] = React.useState(false);
    const [totalUnread, setTotalUnread] = React.useState(0);

    const handleUserClick = (user) => {
        setIsChatOpen(false);
        navigate(`/training/admin/users?athleteId=${user.id}`);
    };

    React.useEffect(() => {
        const checkOrientation = () => {
            const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 540;
            setIsMobileLandscape(landscape);
        };
        window.addEventListener('resize', checkOrientation);
        checkOrientation();
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    // Listen for Global Unread Count
    React.useEffect(() => {
        // Query users with unreadAdmin > 0
        const q = query(collection(db, 'users'), where('unreadAdmin', '>', 0));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => {
                total += (doc.data().unreadAdmin || 0);
            });
            setTotalUnread(total);
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-col lg:flex-row h-screen bg-slate-50">
            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col shrink-0 transition-all">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-black tracking-wider text-emerald-400">PDP ADMIN</h1>
                    <p className="text-xs text-slate-500">2BeTrain Builder v2.0</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <AdminLink to="/training/admin/global-creator" icon={Sparkles} label="Editor Global" />
                    <AdminLink to="/training/admin/programs" icon={Calendar} label="Programas" />
                    <AdminLink to="/training/admin/forms" icon={ClipboardList} label="Control o Seguimiento" />

                    <button
                        onClick={() => setIsChatOpen(true)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-slate-400 hover:bg-slate-800 hover:text-white group relative`}
                    >
                        <MessageCircle size={20} />
                        Mensajes
                        {totalUnread > 0 && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                {totalUnread}
                            </span>
                        )}
                    </button>
                    <div className="pt-4 mt-4 border-t border-slate-800">
                        <AdminLink to="/training/admin/users" icon={Users} label="Usuarios" />
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <NavLink to="/training" className="text-xs text-slate-400 hover:text-white flex items-center gap-2">
                        <ArrowLeft size={14} />
                        Volver a Training User
                    </NavLink>
                </div>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={logout}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-2 w-full px-2 py-2 hover:bg-white/5 rounded-lg transition-all"
                    >
                        <LogOut size={14} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            <div className={`lg:hidden bg-slate-900 text-white shrink-0 flex justify-between items-center border-b border-slate-800 transition-all z-20 relative ${isMobileLandscape ? 'p-1 px-4' : 'p-3'}`}>
                {/* Left: Exit */}
                <NavLink to="/training" className={`rounded-full text-slate-300 font-bold transition-colors bg-slate-800 hover:bg-slate-700 flex items-center gap-2 ${isMobileLandscape ? 'text-[9px] px-3 py-1' : 'text-xs px-3 py-1.5'}`}>
                    <ArrowLeft size={14} />
                    {!isMobileLandscape && "Salir"}
                </NavLink>

                {/* Center: Title */}
                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <span className={`font-black text-emerald-400 tracking-wider transition-all ${isMobileLandscape ? 'text-[10px]' : 'text-sm'}`}>ADMIN</span>
                </div>

                {/* Right: Chat */}
                <button
                    onClick={() => setIsChatOpen(true)}
                    className={`p-2 rounded-full ${isChatOpen ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-400'} relative transition-all`}
                >
                    <MessageCircle size={20} />
                    {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900" />
                    )}
                </button>
            </div>

            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto pb-20 lg:pb-6 ${isMobileLandscape ? 'p-0' : 'p-0 lg:p-6'}`}>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation (Hidden on Desktop) */}
            <nav className={`lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white flex justify-around p-2 pb-safe z-50 border-t border-slate-800 transition-all ${isMobileLandscape ? 'p-1' : 'p-2'}`}>
                <MobileLink to="/training/admin/global-creator" icon={Sparkles} label="Editor" isMobileLandscape={isMobileLandscape} />
                <MobileLink to="/training/admin/programs" icon={Calendar} label="Progr." isMobileLandscape={isMobileLandscape} />

                <MobileLink to="/training/admin/forms" icon={ClipboardList} label="Control" isMobileLandscape={isMobileLandscape} />

                <MobileLink to="/training/admin/users" icon={Users} label="Usuarios" isMobileLandscape={isMobileLandscape} />
            </nav>

            <AdminChatManager
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                onUserClick={handleUserClick}
            />
        </div>
    );
};

const AdminLink = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium 
            ${isActive ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
        }
    >
        <Icon size={20} />
        {label}
    </NavLink>
);

const MobileLink = ({ to, icon: Icon, label, isMobileLandscape }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center rounded-lg transition-all ${isMobileLandscape ? 'min-w-[45px] p-0.5' : 'min-w-[55px] p-1.5'}
            ${isActive ? 'text-emerald-400' : 'text-slate-500'}`
        }
    >
        <Icon size={isMobileLandscape ? 14 : 18} />
        {!isMobileLandscape && <span className="text-[9px] font-bold">{label}</span>}
    </NavLink>
);

export default AdminLayout;
