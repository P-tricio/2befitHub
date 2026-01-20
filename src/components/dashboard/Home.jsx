import React from 'react';
import { Activity, Apple, Dumbbell, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { BrandIcon } from '../common/BrandLogo';
import { Link } from 'react-router-dom';

const modules = [
    {
        id: 'fitness',
        title: '2BeTest',
        subtitle: 'Evaluación y Métricas',
        icon: Activity,
        url: 'https://2befitest.vercel.app/',
        type: 'external',
        status: 'active'
    },
    {
        id: 'nutrition',
        title: '2BeFood',
        subtitle: 'Planificación Nutricional',
        icon: Apple,
        url: 'https://nutri2befit.vercel.app/',
        type: 'external',
        status: 'active'
    },
    {
        id: 'training',
        title: '2BeTrain',
        subtitle: 'Tu Guía de Entrenamiento',
        icon: Dumbbell,
        url: '/training',
        type: 'internal',
        status: 'active' // Now active!
    },
    {
        id: 'goals',
        title: '2BeGoals',
        subtitle: 'Tus Objetivos y Seguimiento',
        icon: Target,
        url: '',
        type: 'coming_soon',
        status: 'coming_soon'
    }
];

const Home = () => {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Welcome */}
            <header className="mb-10 mt-4 px-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center text-center"
                >
                    {/* Center Icon: Large Logo */}
                    <div className="w-64 h-32 mb-6 relative">
                        <BrandIcon size="w-full h-full object-contain drop-shadow-2xl shadow-brand-green/20" />
                    </div>

                    <p className="text-brand-green font-bold uppercase tracking-wider text-xs mb-3">Bienvenido a tu Ecosistema</p>
                </motion.div>
            </header>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 gap-4 px-6">
                {modules.map((mod, index) => (
                    <ModuleCard key={mod.id} module={mod} index={index} />
                ))}
            </div>

            {/* Footer */}
            <div className="mt-auto pt-12 pb-8 text-center px-6">
                <div className="w-12 h-1 bg-gray-200 mx-auto rounded-full mb-6"></div>
                <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em]">Designed for Performance</p>
            </div>
        </div>
    );
};

const ModuleCard = ({ module, index }) => {
    const Icon = module.icon;
    const isLocked = module.status === 'coming_soon';
    const isExternal = module.type === 'external';

    // Wrapper: Link (Internal), a (External), or div (Locked)
    const Wrapper = ({ children, className }) => {
        if (isLocked) return <div className={className}>{children}</div>;
        if (isExternal) return <a href={module.url} className={className}>{children}</a>;
        return <Link to={module.url} className={className}>{children}</Link>;
    };

    return (
        <Wrapper
            className={`
        relative group overflow-hidden rounded-[2rem] p-6 
        bg-white border border-gray-100 shadow-xl shadow-gray-200/50
        transition-all duration-300 block
        ${!isLocked ? 'hover:scale-[1.02] hover:shadow-2xl hover:border-brand-green/30 cursor-pointer active:scale-95' : 'opacity-80 grayscale-[0.5]'}
      `}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
            >
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex flex-col">
                        <span className={`text-2xl font-bold mb-1 ${isLocked ? 'text-gray-400' : 'text-brand-dark group-hover:text-brand-green transition-colors'}`}>
                            {module.title}
                        </span>
                        <span className="text-sm text-gray-400 font-medium">
                            {module.subtitle}
                        </span>
                    </div>

                    <div className={`
                w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isLocked ? 'bg-gray-100 text-gray-300' : 'bg-emerald-500 text-white group-hover:rotate-12 group-hover:scale-110 shadow-lg shadow-emerald-500/30'}
                `}>
                        <Icon size={28} strokeWidth={isLocked ? 1.5 : 2.5} />
                    </div>
                </div>

                {/* Label for locked items */}
                {isLocked && (
                    <div className="absolute top-4 right-4 bg-gray-100 px-3 py-1 rounded-full z-20">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pronto</span>
                    </div>
                )}
            </motion.div>
        </Wrapper>
    );
};

export default Home;
