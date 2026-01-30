import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, ShoppingCart, CheckSquare, BarChart2 } from 'lucide-react';

const BottomNavigation = () => {
    const navItems = [
        { path: '/training', end: true, icon: <Home size={24} />, label: 'Home' },
        { path: '/training/agenda', icon: <Calendar size={24} />, label: 'Agenda' },
        { path: '/training/tracking', icon: <BarChart2 size={24} />, label: 'Seguimiento' },
        { path: '/training/habits', icon: <CheckSquare size={24} />, label: 'Hábitos' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-2 z-40 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) => `
                            flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300
                            ${isActive ? 'text-slate-900 -translate-y-1' : 'text-slate-300 hover:text-slate-400'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-sm' : ''}`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider transition-all duration-300 ${isActive ? 'opacity-100 font-black' : 'opacity-0 scale-0 h-0 w-0 overflow-hidden'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="w-1 h-1 rounded-full bg-slate-900 mt-0.5" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default BottomNavigation;
