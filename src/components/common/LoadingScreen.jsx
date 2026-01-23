import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [0.98, 1, 0.98]
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="max-w-[280px] md:max-w-[400px] w-full"
            >
                <img
                    src="/logo2befitancho.PNG"
                    alt="2BEFIT Corporate Logo"
                    className="w-full h-auto drop-shadow-sm"
                />
            </motion.div>

            <div className="mt-12 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 bg-slate-900 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 bg-slate-900 rounded-full animate-bounce" />
            </div>

            <p className="mt-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-[0.3em]">
                Cargando tu experiencia
            </p>
        </div>
    );
};

export default LoadingScreen;
