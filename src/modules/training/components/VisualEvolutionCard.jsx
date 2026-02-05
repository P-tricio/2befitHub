import React, { useState, useEffect, useRef } from 'react';
import { Camera, Activity, ChevronRight, X, Maximize2, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';

const PanZoomImage = ({ src, label }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const containerRef = useRef(null);

    const handleWheel = (e) => {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        setScale(prev => Math.min(Math.max(1, prev + delta), 4));
    };

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch support basic
    const handleTouchStart = (e) => {
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    return (
        <div className="relative w-full h-full bg-black/50 rounded-2xl overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-black uppercase tracking-widest pointer-events-none">
                {label}
            </div>

            <div className="absolute bottom-4 right-4 z-10 flex gap-2 bg-black/60 p-1.5 rounded-xl backdrop-blur-md">
                <button onClick={() => setScale(s => Math.max(1, s - 0.1))} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <ZoomOut size={16} />
                </button>
                <div className="w-px bg-white/20 mx-1" />
                <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="p-2 hover:bg-white/20 rounded-lg text-white transition-colors">
                    <ZoomIn size={16} />
                </button>
            </div>

            <div
                ref={containerRef}
                className={`w-full h-full flex items-center justify-center cursor-move ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
            >
                <img
                    src={src}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                    }}
                    draggable={false}
                    className="max-w-full max-h-full object-contain"
                />
            </div>

            {/* Hint overlay */}
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none transition-opacity duration-500 ${scale > 1 || isDragging ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex flex-col items-center text-white/50">
                    <Move size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest mt-2">Arrastra y Haz Zoom</span>
                </div>
            </div>
        </div>
    );
};

const VisualEvolutionCard = ({ history }) => {
    const [compareDate1, setCompareDate1] = useState(null);
    const [compareDate2, setCompareDate2] = useState(null);
    const [compareView, setCompareView] = useState('front');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [isFullScreenCompare, setIsFullScreenCompare] = useState(false);

    const photoEntries = history.filter(e => e.photos && Object.values(e.photos).some(u => u));

    useEffect(() => {
        if (photoEntries.length >= 2) {
            setCompareDate1(photoEntries[photoEntries.length - 2].date);
            setCompareDate2(photoEntries[photoEntries.length - 1].date);
        } else if (photoEntries.length === 1) {
            setCompareDate1(photoEntries[0].date);
        }
    }, [history]);

    const getPhoto = (date) => {
        const entry = history.find(e => e.date === date);
        return entry?.photos?.[compareView];
    };

    return (
        <>
            <div className="bg-slate-900 rounded-[3rem] p-4 sm:p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full -mr-48 -mt-48" />
                <div className="relative z-10 space-y-4 sm:space-y-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight">Evolución Visual</h3>
                            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">Comparativa físico</p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full md:w-auto">
                            <div className="flex bg-white/10 p-1 rounded-2xl gap-1 overflow-x-auto flex-1 md:flex-none">
                                {['front', 'side', 'back'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setCompareView(v)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${compareView === v ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {v === 'front' ? 'Frente' : v === 'side' ? 'Perfil' : 'Espalda'}
                                    </button>
                                ))}
                            </div>
                            {compareDate1 && compareDate2 && getPhoto(compareDate1) && getPhoto(compareDate2) && (
                                <button
                                    onClick={() => setIsFullScreenCompare(true)}
                                    className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-colors shadow-lg flex items-center gap-2"
                                >
                                    <Maximize2 size={16} />
                                    <span className="hidden sm:inline">Pantalla Completa</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {photoEntries.length >= 1 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                            {/* Comparison Main Area */}
                            <div className="flex gap-2 sm:gap-4 min-h-[350px] sm:min-h-[400px]">
                                {[compareDate1, compareDate2].map((date, idx) => {
                                    const photo = getPhoto(date);
                                    return (
                                        <div key={idx} className="flex-1 flex flex-col gap-2 sm:gap-4">
                                            <div className="flex flex-col items-center">
                                                <select
                                                    value={date || ''}
                                                    onChange={e => idx === 0 ? setCompareDate1(e.target.value) : setCompareDate2(e.target.value)}
                                                    className="bg-white/10 text-white rounded-xl px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] font-black uppercase tracking-widest border border-white/20 outline-none hover:bg-white/20 transition-all cursor-pointer w-full"
                                                >
                                                    {photoEntries.map(e => (
                                                        <option key={e.date} value={e.date} className="bg-slate-800">{format(new Date(e.date + 'T12:00:00'), 'dd MMM yy', { locale: es })}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div
                                                onClick={() => photo && setSelectedPhoto(photo)}
                                                className="flex-1 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden bg-white/5 border border-white/10 relative group cursor-pointer shadow-inner"
                                            >
                                                {photo ? (
                                                    <img src={photo} className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" alt={`Progreso ${idx}`} />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-3">
                                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full flex items-center justify-center"><Camera size={24} className="sm:w-8 sm:h-8" /></div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Sin foto</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Photo History Timeline */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Historial de Galería</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {[...photoEntries].reverse().slice(0, 9).map((entry, idx) => (
                                        <button
                                            key={entry.date}
                                            onClick={() => {
                                                setCompareDate1(entry.date);
                                                // Optionally set date2 to the previous one
                                            }}
                                            className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all relative group"
                                        >
                                            <img src={entry.photos.front || entry.photos.side || entry.photos.back} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Thumb" />
                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                                <span className="text-[8px] font-black">{format(new Date(entry.date + 'T12:00:00'), 'dd MMM', { locale: es })}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {photoEntries.length > 9 && (
                                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">Y {photoEntries.length - 9} registros más...</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center space-y-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                            <Camera size={48} className="mx-auto text-white/20" />
                            <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Aún no hay fotos de progreso</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Existing Photo Viewer Modal */}
            <AnimatePresence>
                {selectedPhoto && !isFullScreenCompare && (
                    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
                        <div className="relative max-w-4xl w-full h-[90vh] flex items-center justify-center">
                            <img src={selectedPhoto} alt="Full Progress" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                            <button
                                onClick={() => setSelectedPhoto(null)}
                                className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors backdrop-blur-md"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Advanced Comparison Modal */}
            <AnimatePresence>
                {isFullScreenCompare && (
                    <div className="fixed inset-0 z-[6000] bg-black text-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Header Compact for Landscape/Mobile */}
                        <div className="flex items-center justify-between p-4 landscape:py-2 landscape:px-4 bg-black/50 backdrop-blur-md z-10 border-b border-white/10 shrink-0">
                            <div className="flex flex-col landscape:flex-row landscape:items-center landscape:gap-4">
                                <h3 className="text-lg landscape:text-sm font-black tracking-tight">Comparativa Avanzada</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest landscape:text-[10px]">
                                    {compareView === 'front' ? 'Frente' : compareView === 'side' ? 'Perfil' : 'Espalda'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFullScreenCompare(false)}
                                className="p-3 landscape:p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                            >
                                <X size={24} className="landscape:w-4 landscape:h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1 p-1 md:p-4 bg-slate-900">
                            <div className="relative rounded-3xl overflow-hidden border-2 border-white/5">
                                <PanZoomImage
                                    src={getPhoto(compareDate1)}
                                    label={format(new Date(compareDate1 + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                />
                            </div>
                            <div className="relative rounded-3xl overflow-hidden border-2 border-white/5">
                                <PanZoomImage
                                    src={getPhoto(compareDate2)}
                                    label={format(new Date(compareDate2 + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default VisualEvolutionCard;
