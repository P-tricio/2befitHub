import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Dumbbell, Layers, Calendar, ClipboardList, ArrowLeft, Users, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const AdminLayout = () => {
    const { logout } = useAuth();
    const [isMobileLandscape, setIsMobileLandscape] = React.useState(false);

    React.useEffect(() => {
        const checkOrientation = () => {
            const landscape = window.innerWidth > window.innerHeight && window.innerHeight <= 540;
            setIsMobileLandscape(landscape);
        };
        window.addEventListener('resize', checkOrientation);
        checkOrientation();
        return () => window.removeEventListener('resize', checkOrientation);
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

            <div className={`lg:hidden bg-slate-900 text-white shrink-0 flex justify-between items-center border-b border-slate-800 transition-all ${isMobileLandscape ? 'p-1 px-4' : 'p-3'}`}>
                <div className="flex items-center gap-2">
                    <span className={`font-black text-emerald-400 tracking-wider transition-all ${isMobileLandscape ? 'text-[10px]' : 'text-sm'}`}>PDP ADMIN</span>
                </div>
                <NavLink to="/training" className={`rounded-full text-slate-300 font-bold transition-colors bg-slate-800 hover:bg-slate-700 ${isMobileLandscape ? 'text-[9px] px-2 py-0.5' : 'text-xs px-3 py-1.5'}`}>
                    Salir
                </NavLink>
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
