import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { TrainingDB } from '../services/db';

const PhotoComparisonModal = ({ userId, onClose }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date1, setDate1] = useState(null);
    const [date2, setDate2] = useState(null);
    const [view, setView] = useState('front'); // 'front' | 'side' | 'back'

    useEffect(() => {
        const loadPhotos = async () => {
            try {
                // Fetch all tracking entries for the user
                // Actually, TrainingDB doesn't have a getAllTracking yet. Let's assume we can fetch it.
                // Or we can just fetch all tracking docs from 'users/{userId}/tracking'
                const allTracking = await TrainingDB.tracking.getAll(userId);

                // Filter entries that have at least one photo
                const photoEntries = allTracking
                    .filter(e => e.photos && Object.values(e.photos).some(u => u))
                    .sort((a, b) => b.date.localeCompare(a.date)); // Newest first

                setEntries(photoEntries);
                if (photoEntries.length >= 2) {
                    setDate1(photoEntries[0].date);
                    setDate2(photoEntries[1].date);
                } else if (photoEntries.length === 1) {
                    setDate1(photoEntries[0].date);
                }
            } catch (err) {
                console.error("Error loading photos for comparison", err);
            } finally {
                setLoading(false);
            }
        };
        loadPhotos();
    }, [userId]);

    const entry1 = entries.find(e => e.date === date1);
    const entry2 = entries.find(e => e.date === date2);

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/90 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-800 w-full max-w-4xl rounded-[2.5rem] border border-slate-700 shadow-2xl z-[510] overflow-hidden flex flex-col h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
                    <div>
                        <h3 className="text-2xl font-black text-white">Comparativa de Progreso</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Visualiza tu evolución</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-white">
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        >
                            <Camera size={40} />
                        </motion.div>
                        <p className="font-bold">Cargando galería...</p>
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12 text-center">
                        <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center text-slate-500">
                            <Camera size={40} />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white mb-2">Sin fotos suficientes</h4>
                            <p className="text-slate-400 max-w-xs mx-auto">Sube fotos de progreso en tus tareas de seguimiento para poder compararlas.</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        {/* View Selector & Selectors */}
                        <div className="p-6 bg-slate-900/20 flex flex-wrap gap-4 items-center justify-between border-b border-slate-700/50">
                            {/* View Tabs */}
                            <div className="flex bg-slate-700/50 p-1 rounded-xl">
                                {[
                                    { id: 'front', label: 'Frente' },
                                    { id: 'side', label: 'Perfil' },
                                    { id: 'back', label: 'Espalda' }
                                ].map(v => (
                                    <button
                                        key={v.id}
                                        onClick={() => setView(v.id)}
                                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${view === v.id ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>

                            {/* Date Selectors */}
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase mb-1">Fecha A</span>
                                    <select
                                        value={date1 || ''}
                                        onChange={e => setDate1(e.target.value)}
                                        className="bg-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold border border-slate-600 outline-none"
                                    >
                                        {entries.map(e => (
                                            <option key={e.date} value={e.date}>{format(parseISO(e.date), 'dd/MM/yyyy')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-slate-600 font-bold">vs</div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-slate-500 uppercase mb-1">Fecha B</span>
                                    <select
                                        value={date2 || ''}
                                        onChange={e => setDate2(e.target.value)}
                                        className="bg-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold border border-slate-600 outline-none"
                                    >
                                        {entries.map(e => (
                                            <option key={e.date} value={e.date}>{format(parseISO(e.date), 'dd/MM/yyyy')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Comparison Display */}
                        <div className="flex-1 p-6 flex gap-4 overflow-hidden">
                            {/* Panel 1 */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="text-center">
                                    <span className="text-lg font-black text-white">{date1 ? format(parseISO(date1), 'd MMM yyyy') : '-'}</span>
                                </div>
                                <div className="flex-1 rounded-3xl overflow-hidden bg-slate-900/50 border border-slate-700 relative group">
                                    {entry1?.photos?.[view] ? (
                                        <img src={entry1.photos[view]} className="w-full h-full object-contain" alt="Progress 1" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                            <Camera size={48} />
                                            <span className="text-xs font-bold">Sin foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Panel 2 */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div className="text-center">
                                    <span className="text-lg font-black text-white">{date2 ? format(parseISO(date2), 'd MMM yyyy') : '-'}</span>
                                </div>
                                <div className="flex-1 rounded-3xl overflow-hidden bg-slate-900/50 border border-slate-700 relative group">
                                    {entry2?.photos?.[view] ? (
                                        <img src={entry2.photos[view]} className="w-full h-full object-contain" alt="Progress 2" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2">
                                            <Camera size={48} />
                                            <span className="text-xs font-bold">Sin foto</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default PhotoComparisonModal;
