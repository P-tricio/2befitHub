import React, { useState, useEffect } from 'react';
import { Play, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ExerciseMedia - A unified component to handle all types of exercise visualizations:
 * 1. YouTube videos (regular and shorts)
 * 2. Direct video/GIF links (mediaUrl)
 * 3. Legacy Auto-GIFs (alternating between imageStart and imageEnd)
 * 4. Fallback thumbnails
 */
const ExerciseMedia = ({
    exercise,
    className = "w-full h-full",
    thumbnailMode = false,
    autoPlay = false,
    showControls = true
}) => {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentImage, setCurrentImage] = useState(null);
    const [loading, setLoading] = useState(true);

    const youtubeId = getYoutubeVideoId(exercise?.youtubeUrl);
    const hasMediaUrl = !!exercise?.mediaUrl;
    const hasAutoGif = !!(exercise?.imageStart && exercise?.imageEnd);

    // Initial image / thumbnail logic
    useEffect(() => {
        let initialImage = null;
        if (exercise?.mediaUrl) {
            initialImage = exercise.mediaUrl;
        } else if (exercise?.imageStart) {
            initialImage = exercise.imageStart;
        } else if (youtubeId) {
            initialImage = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
        }
        setCurrentImage(initialImage);
    }, [exercise, youtubeId]);

    // Auto-GIF Animation loop
    useEffect(() => {
        if (hasMediaUrl || youtubeId || !hasAutoGif || thumbnailMode) return;

        const interval = setInterval(() => {
            setCurrentImage(prev => prev === exercise.imageStart ? exercise.imageEnd : exercise.imageStart);
        }, 700);
        return () => clearInterval(interval);
    }, [exercise, hasMediaUrl, youtubeId, hasAutoGif, thumbnailMode]);

    function getYoutubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Render logic for different modes
    if (isPlaying && youtubeId && !thumbnailMode) {
        return (
            <div className={`relative ${className} bg-black`}>
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                    title={exercise.name_es || exercise.name}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    onLoad={() => setLoading(false)}
                />
                {showControls && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPlaying(false); }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            className={`relative overflow-hidden flex items-center justify-center bg-slate-100 ${className}`}
            onClick={() => {
                if (!thumbnailMode && youtubeId) setIsPlaying(true);
            }}
        >
            {currentImage ? (
                <img
                    src={currentImage}
                    alt={exercise.name_es || exercise.name}
                    className={`w-full h-full object-contain ${thumbnailMode ? 'object-cover' : ''} transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => setLoading(false)}
                    onError={(e) => {
                        setLoading(false);
                        e.target.style.display = 'none';
                    }}
                />
            ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                    <ImageIcon size={thumbnailMode ? 16 : 32} />
                    {!thumbnailMode && <span className="text-[10px] font-bold uppercase tracking-widest">Sin Media</span>}
                </div>
            )}

            {loading && currentImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                    <Loader2 className="animate-spin text-emerald-500" size={24} />
                </div>
            )}

            {/* Play overlay for videos */}
            {!thumbnailMode && youtubeId && !isPlaying && (
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center group cursor-pointer">
                    <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-xl transform transition-transform group-hover:scale-110">
                        <Play size={24} fill="currentColor" className="ml-1" />
                    </div>
                </div>
            )}

            {/* Video signifier for thumbnails */}
            {thumbnailMode && youtubeId && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white p-0.5 rounded text-[8px] font-black uppercase flex items-center gap-0.5 px-1">
                    <Play size={8} fill="currentColor" />
                    Video
                </div>
            )}
        </div>
    );
};

export default ExerciseMedia;
