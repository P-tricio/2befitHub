import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Home, Dumbbell, User, Menu, X, Globe, Info, Instagram, LogOut, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo } from '../common/BrandLogo';

const MainLayout = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const { logout } = useAuth();

    const isHome = location.pathname === '/hub' || location.pathname === '/';

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 relative overflow-hidden shadow-2xl pt-[env(safe-area-inset-top)]">
            {/* Floating Header - Only on Home */}
            {isHome && (
                <div className="fixed top-[env(safe-area-inset-top)] left-0 right-0 p-4 z-50 flex justify-between items-center pointer-events-none max-w-md mx-auto">
                    <NavLink to="/" className="pointer-events-auto active:scale-95 transition-all w-12 h-12 flex items-center justify-center">
                        <img src="/brand-compact.png" alt="2BeFit" className="w-8 h-8 object-contain" />
                    </NavLink>

                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="pointer-events-auto text-slate-900 hover:text-emerald-600 active:scale-95 transition-all w-12 h-12 flex items-center justify-center"
                    >
                        <Menu size={32} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <main className={`flex-1 overflow-y-auto relative z-0 ${isHome ? 'pt-20' : 'pt-4'} pb-24 bg-slate-50`}>
                <Outlet />
            </main>


            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMenuOpen(false)}
                            className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed inset-y-0 right-0 z-[70] w-72 bg-white shadow-2xl flex flex-col max-w-[80vw]"
                        >
                            <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-slate-900">Menú</h2>
                                <button
                                    onClick={() => setIsMenuOpen(false)}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-2">
                                <MenuLink icon={Globe} label="Web Oficial" href="https://2befit.vercel.app/" />
                                <MenuLink icon={Info} label="Sobre Nosotros" href="https://2befit.vercel.app/#about" />
                                <div className="my-4 border-t border-gray-100"></div>
                                <MenuLink icon={Instagram} label="@2befit.online" href="https://instagram.com/2befit.online" highlight />
                                <div className="my-4 border-t border-gray-100"></div>
                                <button
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-3 p-4 rounded-xl text-red-500 hover:bg-red-50 w-full transition-all"
                                >
                                    <LogOut size={20} />
                                    <span className="font-bold">Cerrar Sesión</span>
                                </button>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                                <div className="flex justify-center mb-4">
                                    <img src="/brand-compact.png" alt="2BeFit" className="h-6 w-auto opacity-50 grayscale" />
                                </div>
                                <p className="text-xs text-slate-400">
                                    © {new Date().getFullYear()} 2BEFIT Ecosystem<br />
                                    v1.0.0 Alpha
                                </p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const NavItem = ({ to, icon: Icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center relative group transition-all duration-300 w-12
      ${isActive ? "text-emerald-600 scale-110" : "text-slate-400 hover:text-slate-600"}`
        }
    >
        <Icon size={28} strokeWidth={2.5} />
    </NavLink>
);

const MenuLink = ({ icon: Icon, label, href, highlight }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`
      flex items-center justify-between p-4 rounded-xl transition-all duration-200 group w-full
      ${highlight ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900'}
    `}
    >
        <div className="flex items-center gap-3">
            <Icon size={20} className={highlight ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-900'} />
            <span className={`font-medium ${highlight ? 'font-bold' : ''}`}>{label}</span>
        </div>
    </a>
);

export default MainLayout;
