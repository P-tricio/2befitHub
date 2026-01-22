import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, TrendingUp, TrendingDown, Activity, ChevronRight, Scale, Ruler, Footprints, Utensils, Target, Plus, X } from 'lucide-react';
import { TrainingDB } from '../../services/db';
import { useAuth } from '../../../../context/AuthContext';
import PhotoComparisonModal from '../../components/PhotoComparisonModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AthleteTracking = () => {
    const { currentUser } = useAuth();
    const [isComparingPhotos, setIsComparingPhotos] = useState(false);
    const [history, setHistory] = useState([]);
    const [minimums, setMinimums] = useState([]);
    const [newMinimum, setNewMinimum] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;
        const loadHistory = async () => {
            try {
                // Fetch full tracking history for charts/stats
                const data = await TrainingDB.tracking.getAll(currentUser.uid);
                setHistory(data || []);

                // Fetch user profile for minimums
                const userSnapshot = await TrainingDB.users.getAll(); // This is not ideal, but for MVP
                const profile = userSnapshot.find(u => u.id === currentUser.uid);
                if (profile?.minimums) setMinimums(profile.minimums);
            } catch (err) {
                console.error("Error loading tracking history", err);
            } finally {
                setLoading(false);
            }
        };
        loadHistory();
    }, [currentUser]);

    const handleAddMinimum = async () => {
        if (!newMinimum.trim()) return;
        const updated = [...minimums, newMinimum.trim()];
        setMinimums(updated);
        setNewMinimum('');
        await TrainingDB.users.updateProfile(currentUser.uid, { minimums: updated });
    };

    const handleRemoveMinimum = async (index) => {
        const updated = minimums.filter((_, i) => i !== index);
        setMinimums(updated);
        await TrainingDB.users.updateProfile(currentUser.uid, { minimums: updated });
    };

    // Stats calculation
    const currentWeight = history.length > 0 ? history[0].weight : null;
    const previousWeight = history.length > 1 ? history[1].weight : null;
    const weightDiff = currentWeight && previousWeight ? (currentWeight - previousWeight).toFixed(1) : 0;

    return (
        <div className="p-6 max-w-lg mx-auto space-y-8 pb-32">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Seguimiento</h1>
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Evolución y Estadísticas</p>
            </header>

            {/* Evolution Card (Photo Comparison) */}
            <section
                onClick={() => setIsComparingPhotos(true)}
                className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-all"
            >
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/20 blur-[80px] rounded-full -mr-20 -mt-20 group-hover:bg-emerald-500/30 transition-colors" />
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                        <div className="bg-emerald-500 text-slate-900 w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-12 transition-transform">
                            <Camera size={28} />
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Tu Progreso</span>
                            <span className="text-2xl font-black">Tu Evolución</span>
                        </div>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[200px]">
                            Compara tus fotos de progreso y visualiza tus cambios físicos.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-widest mt-2 group-hover:translate-x-1 transition-transform">
                        Entrar a la galería <ChevronRight size={16} />
                    </div>
                </div>
            </section>

            {/* Metrics Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Scale size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso Actual</p>
                        <div className="flex items-baseline gap-1">
                            <p className="text-2xl font-black text-slate-900">{currentWeight || '--'}</p>
                            <span className="text-[10px] font-bold text-slate-400">kg</span>
                        </div>
                    </div>
                    {weightDiff !== 0 && (
                        <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${weightDiff < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {weightDiff < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                            {Math.abs(weightDiff)} kg vs anterior
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <Activity size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registros</p>
                        <p className="text-2xl font-black text-slate-900">{history.length}</p>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entradas totales</p>
                </div>
            </div>

            {/* User Minimums Section */}
            <section className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-black text-emerald-900 flex items-center gap-2">
                            <Target size={24} className="text-emerald-500" />
                            Mis Mínimos
                        </h3>
                        <p className="text-emerald-700/60 text-[10px] font-bold uppercase tracking-widest mt-1">HÁBITOS PERSONALES</p>
                    </div>
                </div>

                <div className="space-y-2">
                    {minimums.map((min, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/60 backdrop-blur-sm px-4 py-3 rounded-2xl border border-emerald-200/50">
                            <span className="font-bold text-emerald-900 text-sm">{min}</span>
                            <button onClick={() => handleRemoveMinimum(i)} className="text-emerald-300 hover:text-rose-500 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ej: Dormir 8h"
                        value={newMinimum}
                        onChange={(e) => setNewMinimum(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddMinimum()}
                        className="flex-1 bg-white border border-emerald-200 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-emerald-400/20"
                    />
                    <button
                        onClick={handleAddMinimum}
                        className="bg-emerald-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-colors shrink-0"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                <p className="text-[10px] text-emerald-600/60 font-medium italic px-2">
                    Estos hábitos aparecerán en tus controles diarios para que puedas marcarlos.
                </p>
            </section>

            {/* List of Previous Logs */}
            <section className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2 px-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Historial de Medidas
                </h3>

                <div className="space-y-3">
                    {loading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-[2rem]" />
                        ))
                    ) : history.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-100 border-dashed rounded-[2rem] p-12 text-center">
                            <p className="text-slate-400 font-bold">No hay registros aún</p>
                        </div>
                    ) : (
                        history.map((entry, idx) => (
                            <div key={entry.date || idx} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex flex-col items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <span className="text-[8px] font-bold uppercase">{format(new Date(entry.date + 'T12:00:00'), 'MMM', { locale: es })}</span>
                                        <span className="text-lg font-black leading-none">{format(new Date(entry.date + 'T12:00:00'), 'dd')}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">{entry.weight ? `${entry.weight} kg` : 'Sin peso'}</p>
                                        <div className="flex gap-2 mt-0.5">
                                            {entry.measurements?.waist && <span className="text-[9px] font-bold text-slate-400 uppercase">Cintura: {entry.measurements.waist}cm</span>}
                                            {entry.measurements?.hip && <span className="text-[9px] font-bold text-slate-400 uppercase">Cadera: {entry.measurements.hip}cm</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {entry.photos && Object.values(entry.photos).some(u => u) && (
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                            <Camera size={14} />
                                        </div>
                                    )}
                                    <ChevronRight size={16} className="text-slate-200 group-hover:text-slate-900 transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Photo Comparison Modal */}
            <AnimatePresence>
                {isComparingPhotos && (
                    <PhotoComparisonModal
                        userId={currentUser.uid}
                        onClose={() => setIsComparingPhotos(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AthleteTracking;
