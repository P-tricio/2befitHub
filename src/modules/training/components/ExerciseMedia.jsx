import React, { useState, useEffect } from 'react';
import { Play, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseAPI } from '../services/exerciseApi';

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
    staticMode = false,
    showControls = true,
    lazyLoad = true
}) => {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [currentImage, setCurrentImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const youtubeId = getYoutubeVideoId(exercise?.youtubeUrl);
    const hasMediaUrl = !!(exercise?.mediaUrl || exercise?.gifUrl);
    const hasAutoGif = !!(exercise?.imageStart && exercise?.imageEnd);

    // Lazy loading logic for online exercises in library/picker
    const isOnline = exercise?.source === 'exercisedb' || ((exercise?.mediaUrl || exercise?.gifUrl) && !(exercise?.mediaUrl || exercise?.gifUrl).includes('imgbb') && !(exercise?.mediaUrl || exercise?.gifUrl).includes('ibb.co'));
    const shouldLazyLoad = lazyLoad && thumbnailMode && isOnline;

    // Initial image / thumbnail logic
    useEffect(() => {
        let activeBlobUrl = null;
        let isMounted = true;

        if (shouldLazyLoad && !isHovered && !isPlaying) {
            setCurrentImage(null);
            setLoading(false);
            return;
        }

        const loadContent = async () => {
            setLoading(true);
            let initialImage = null;

            // Check if mediaUrl is actually a YouTube link (including Shorts)
            const mediaYoutubeId = getYoutubeVideoId(exercise?.mediaUrl);
            const finalYoutubeId = youtubeId || mediaYoutubeId;

            if (finalYoutubeId) {
                // Priority: YouTube Thumbnail (matches standard or shorts)
                initialImage = `https://img.youtube.com/vi/${finalYoutubeId}/hqdefault.jpg`;
            } else if (exercise?.mediaUrl || exercise?.gifUrl) {
                const targetUrl = exercise.mediaUrl || exercise.gifUrl;
                const isUrl = targetUrl.includes('http') || targetUrl.includes('/');
                const isProtected = targetUrl.includes('exercisedb.p.rapidapi.com');
                const isLegacyId = !isUrl;

                if (isProtected || (exercise.source === 'exercisedb' && !targetUrl.includes('imgbb') && !targetUrl.includes('ibb.co')) || isLegacyId) {
                    try {
                        const blob = await ExerciseAPI.fetchImageBlob(targetUrl || exercise.id);
                        if (blob && isMounted) {
                            activeBlobUrl = URL.createObjectURL(blob);
                            initialImage = activeBlobUrl;
                        }
                    } catch (e) {
                        console.error('Failed to load protected image:', e);
                        initialImage = null;
                    }
                } else {
                    initialImage = exercise.mediaUrl;
                }
            } else if (exercise?.imageStart) {
                initialImage = exercise.imageStart;
            }

            if (isMounted) {
                setCurrentImage(initialImage);
                setLoading(false);
            }
        };

        loadContent();

        return () => {
            isMounted = false;
            if (activeBlobUrl) {
                URL.revokeObjectURL(activeBlobUrl);
            }
        };
    }, [exercise, youtubeId, shouldLazyLoad, isHovered, isPlaying]);

    // Auto-GIF Animation loop
    useEffect(() => {
        // If we have a YouTube video, don't use the alternating loop
        if (youtubeId || !hasAutoGif) return;

        // If we have a mediaUrl that ISN'T one of the auto-gif images, 
        // it means we have a real video/GIF link, so we don't need the loop.
        const isRealMediaUrl = hasMediaUrl &&
            exercise.mediaUrl !== exercise.imageStart &&
            exercise.mediaUrl !== exercise.imageEnd;

        if (isRealMediaUrl) return;

        // If in thumbnailMode or staticMode, we want it static
        if (thumbnailMode || staticMode) {
            setCurrentImage(exercise.imageStart || exercise.mediaUrl || exercise.gifUrl);
            return;
        }

        const interval = setInterval(() => {
            setCurrentImage(prev => prev === exercise.imageStart ? exercise.imageEnd : exercise.imageStart);
        }, 750);
        return () => clearInterval(interval);
    }, [exercise.imageStart, exercise.imageEnd, exercise.mediaUrl, hasMediaUrl, youtubeId, hasAutoGif, thumbnailMode]);

    function getYoutubeVideoId(url) {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    // Render logic for different modes
    if (isPlaying && youtubeId && !thumbnailMode) {
        return (
            <div className={`relative ${className} bg-black`}>
                <iframe
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
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
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
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
                        // YouTube Fallback Logic (HQ -> MQ)
                        if (currentImage && currentImage.includes('hqdefault.jpg')) {
                            const mqUrl = currentImage.replace('hqdefault.jpg', 'mqdefault.jpg');
                            setCurrentImage(mqUrl);
                            // Don't stop loading yet, let the new src try
                        } else {
                            setLoading(false);
                            e.target.style.display = 'none';
                        }
                    }}
                />
            ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                    {shouldLazyLoad && !isHovered && !loading ? (
                        <>
                            <Loader2 className="animate-spin text-slate-200" size={thumbnailMode ? 14 : 24} />
                            {!thumbnailMode && <span className="text-[10px] font-bold uppercase tracking-widest">Cargando al pasar cursor...</span>}
                        </>
                    ) : (
                        <>
                            <ImageIcon size={thumbnailMode ? 16 : 32} />
                            {!thumbnailMode && <span className="text-[10px] font-bold uppercase tracking-widest">Sin Media</span>}
                        </>
                    )}
                </div>
            )}

            {loading && currentImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm">
                    <Loader2 className="animate-spin text-emerald-500" size={24} />
                </div>
            )}

            {/* Play overlay for videos - Hide in staticMode */}
            {!thumbnailMode && !staticMode && youtubeId && !isPlaying && (
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
