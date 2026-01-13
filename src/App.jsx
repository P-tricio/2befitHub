import React, { useState } from 'react';
import { Activity, Apple, Dumbbell, Target, Menu, X, Info, Globe, Instagram, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandLogo, BrandIcon } from './components/common/BrandLogo';
import InstallPWA from './components/common/InstallPWA';

const modules = [
  {
    id: 'fitness',
    title: '2BeTest',
    subtitle: 'Evaluación y Métricas',
    icon: Activity,
    url: 'https://2befitest.vercel.app/',
    status: 'active'
  },
  {
    id: 'nutrition',
    title: '2BeFood',
    subtitle: 'Planificación Nutricional Inteligente',
    icon: Apple,
    url: 'https://nutri2befit.vercel.app/',
    status: 'active'
  },
  {
    id: 'training',
    title: '2BeTrain',
    subtitle: 'Tu Guía de Entrenamiento',
    icon: Dumbbell,
    url: '',
    status: 'coming_soon'
  },
  {
    id: 'goals',
    title: '2BeGoals',
    subtitle: 'Tus Objetivos y Seguimiento',
    icon: Target,
    url: '',
    status: 'coming_soon'
  }
];

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-brand-dark font-sans selection:bg-brand-green/30 selection:text-brand-dark">
      <InstallPWA />

      {/* Navbar (Mobile First) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-6 shadow-sm">
        <div className="h-8 flex items-center">
          <BrandLogo size="h-8 w-auto object-contain" />
        </div>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-brand-dark hover:text-brand-green transition-colors"
        >
          <Menu size={28} />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            />

            {/* Slide-over Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[70] w-80 bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-brand-dark">Menú</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-400 hover:text-brand-dark hover:bg-gray-100 rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-2">
                <MenuLink icon={Globe} label="Web Oficial" href="https://2befit.vercel.app/" />
                <MenuLink icon={Info} label="Sobre Nosotros" href="https://2befit.vercel.app/#about" />
                <div className="my-4 border-t border-gray-100"></div>
                <MenuLink icon={Instagram} label="@2befit.online" href="https://instagram.com/2befit.online" highlight />
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                <div className="flex justify-center mb-4">
                  <BrandLogo size="h-6 w-auto opacity-50 grayscale" />
                </div>
                <p className="text-xs text-gray-400">
                  © {new Date().getFullYear()} 2BEFIT Ecosystem<br />
                  v1.0.0 Alpha
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Hub Content */}
      <main className="pt-24 px-6 pb-12 max-w-lg mx-auto flex flex-col min-h-screen">

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
        <div className="grid grid-cols-1 gap-4">
          {modules.map((mod, index) => (
            <ModuleCard key={mod.id} module={mod} index={index} />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-12 text-center">
          <div className="w-12 h-1 bg-gray-200 mx-auto rounded-full mb-6"></div>
          <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em]">Designed for Performance</p>
        </div>
      </main>
    </div>
  );
}

const ModuleCard = ({ module, index }) => {
  const Icon = module.icon;
  const isLocked = module.status === 'coming_soon';

  return (
    <motion.a
      href={isLocked ? undefined : module.url}
      target={isLocked ? undefined : "_blank"}
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`
        relative group overflow-hidden rounded-[2rem] p-6 
        bg-white border border-gray-100 shadow-xl shadow-gray-200/50
        transition-all duration-300
        ${!isLocked ? 'hover:scale-[1.02] hover:shadow-2xl hover:border-brand-green/30 cursor-pointer active:scale-95' : 'opacity-80 grayscale-[0.5]'}
      `}
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
          ${isLocked ? 'bg-gray-100 text-gray-300' : 'bg-brand-green text-brand-dark group-hover:rotate-12 group-hover:scale-110 shadow-lg shadow-brand-green/30'}
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
    </motion.a>
  );
};

const MenuLink = ({ icon: Icon, label, href, highlight }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`
      flex items-center justify-between p-4 rounded-xl transition-all duration-200 group w-full
      ${highlight ? 'bg-brand-green/10 text-brand-green hover:bg-brand-green/20' : 'hover:bg-gray-50 text-gray-600 hover:text-brand-dark'}
    `}
  >
    <div className="flex items-center gap-3">
      <Icon size={20} className={highlight ? 'text-brand-green' : 'text-gray-400 group-hover:text-brand-dark'} />
      <span className={`font-medium ${highlight ? 'font-bold' : ''}`}>{label}</span>
    </div>
    <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${highlight ? 'text-brand-green' : 'text-gray-400'}`} />
  </a>
);

export default App;
