import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const InstallPWA = () => {
    const [supportsPWA, setSupportsPWA] = useState(false);
    const [promptInstall, setPromptInstall] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    // Check if dismissed previously
    const [isDismissed, setIsDismissed] = useState(() => {
        return localStorage.getItem('pwa_install_dismissed') === 'true';
    });

    useEffect(() => {
        // 1. Check for Android/Desktop native install prompt
        const handler = (e) => {
            e.preventDefault();
            setSupportsPWA(true);
            setPromptInstall(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // 2. Check for iOS (Safari doesn't support beforeinstallprompt)
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

        if (isIosDevice && !isStandalone) {
            setIsIOS(true);
            setSupportsPWA(true);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = (e) => {
        e.preventDefault();
        if (promptInstall) {
            // Android/Desktop: Trigger native prompt
            promptInstall.prompt();
            promptInstall.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    dismissBanner(); // Installed!
                }
            });
        } else if (isIOS) {
            // iOS: Show manual instructions
            setShowInstructions(true);
        }
    };

    const dismissBanner = () => {
        setIsDismissed(true);
        localStorage.setItem('pwa_install_dismissed', 'true');
        setShowInstructions(false);
    };

    if (!supportsPWA || isDismissed) return null;

    return (
        <>
            {/* Main Floating Banner */}
            {/* Hidden if iOS instructions are open to avoid clutter */}
            {!showInstructions && (
                <div className="fixed bottom-6 left-4 right-4 z-[1000] animate-in slide-in-from-bottom fade-in duration-500 max-w-md mx-auto">
                    <div className="bg-brand-dark/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-brand-green p-2 rounded-xl">
                                <Download size={20} className="text-brand-dark" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">Instalar 2BEFITHUB</h4>
                                <p className="text-xs text-white/60">Experiencia App Completa</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleInstallClick}
                                className="bg-white text-brand-dark px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                            >
                                Instalar
                            </button>
                            <button
                                onClick={dismissBanner}
                                className="p-2 text-white/40 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* iOS Instructions Modal */}
            {isIOS && showInstructions && (
                <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center pointer-events-none">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={() => setShowInstructions(false)} />

                    <div className="bg-white w-full max-w-sm m-4 rounded-[2rem] p-6 pointer-events-auto relative animate-in slide-in-from-bottom duration-300">
                        <button
                            onClick={() => setShowInstructions(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center mb-6">
                            <h3 className="text-xl font-black text-brand-dark mb-2">Instalar en iPhone</h3>
                            <p className="text-gray-500 text-sm">Sigue estos simples pasos:</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <Share className="text-brand-green flex-shrink-0" size={24} />
                                <p className="text-sm text-gray-700">1. Toca <strong>Compartir</strong> en la barra inferior.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <PlusSquare className="text-brand-green flex-shrink-0" size={24} />
                                <p className="text-sm text-gray-700">2. Selecciona <strong>"Añadir a Inicio"</strong>.</p>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-center">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">2BEFITHUB</span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default InstallPWA;
