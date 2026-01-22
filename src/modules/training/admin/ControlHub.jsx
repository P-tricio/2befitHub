import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Activity, ChevronRight } from 'lucide-react';
import FormCreator from './FormCreator';

const ControlHub = () => {
    const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'metrics'

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-slate-900">Control o Seguimiento</h1>
                <p className="text-slate-500 text-sm">Gestiona formularios de check-in y métricas personalizadas.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setActiveTab('forms')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'forms'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                        }`}
                >
                    <ClipboardList size={20} />
                    Formularios
                </button>
                <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-bold transition-all ${activeTab === 'metrics'
                            ? 'bg-slate-900 text-white shadow-lg'
                            : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
                        }`}
                >
                    <Activity size={20} />
                    Métricas Custom
                </button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                {activeTab === 'forms' ? (
                    <div className="h-full">
                        {/* We use FormCreator here, but we might need to adjust it to be "inline" rather than a full-screen modal if possible, 
                            or just let it behave as it does. Actually FormCreator is currently a fixed inset-0 modal. 
                            Let's refactor it to be used as a component.
                        */}
                        <FormCreator isInline={true} />
                    </div>
                ) : (
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                            <Activity size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Métricas Personalizadas</h3>
                        <p className="text-slate-500 max-w-md">
                            Próximamente: Podrás definir plantillas de métricas (Bíceps, %Grasa, etc.)
                            para asignarlas rápidamente a tus atletas desde este panel.
                        </p>
                        <div className="pt-4">
                            <span className="px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-black uppercase rounded-full">
                                Característica en Desarrollo
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ControlHub;
