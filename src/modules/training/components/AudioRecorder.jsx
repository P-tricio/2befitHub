import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AudioRecorder = ({ onRecordingComplete, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("No se pudo acceder al micrófono. Por favor, verifica los permisos.");
            onCancel();
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSend = () => {
        if (audioBlob) {
            onRecordingComplete(audioBlob);
        }
    };

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-slate-100 p-2 px-4 rounded-2xl w-full">
            {!audioBlob ? (
                <>
                    <div className="flex items-center gap-2 flex-1">
                        <motion.div
                            animate={isRecording ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500' : 'bg-slate-400'}`}
                        />
                        <span className="text-xs font-mono font-bold text-slate-600">
                            {isRecording ? formatTime(recordingTime) : 'Listo para grabar'}
                        </span>
                    </div>

                    <button
                        onClick={onCancel}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>

                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                        >
                            <Mic size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={stopRecording}
                            className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                        >
                            <Square size={18} />
                        </button>
                    )}
                </>
            ) : (
                <>
                    <audio
                        ref={audioRef}
                        src={URL.createObjectURL(audioBlob)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                    />
                    <button
                        onClick={togglePlayback}
                        className="p-2 bg-white text-slate-900 rounded-xl shadow-sm active:scale-95 transition-all"
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <div className="flex-1 text-xs font-bold text-slate-500">
                        Grabación completa ({formatTime(recordingTime)}s)
                    </div>

                    <button
                        onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>

                    <button
                        onClick={handleSend}
                        className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                    >
                        <Send size={18} />
                    </button>
                </>
            )}
        </div>
    );
};

export default AudioRecorder;
