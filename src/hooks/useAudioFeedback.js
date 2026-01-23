import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook for robust audio feedback using Web Audio API.
 * Handles AudioContext lifecycle and provides standard sound patterns.
 */
export const useAudioFeedback = () => {
    const audioCtx = useRef(null);

    // Initialize AudioContext
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx.current = new AudioContext();
        }
        return () => {
            if (audioCtx.current && audioCtx.current.state !== 'closed') {
                audioCtx.current.close().catch(console.error);
            }
        };
    }, []);

    // Helper to generic oscillator beep
    const playTone = useCallback((freq, type = 'sine', duration = 0.1, volume = 0.2) => {
        if (!audioCtx.current) return;

        // Resume context if suspended (browser autoplay policy)
        if (audioCtx.current.state === 'suspended') {
            audioCtx.current.resume().catch(console.error);
        }

        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);

        // Increased volume baseline and ramp
        gain.gain.setValueAtTime(volume, audioCtx.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        osc.start();
        osc.stop(audioCtx.current.currentTime + duration);
    }, []);

    // Patterns mit increased volume (approx double)
    const playTick = useCallback(() => playTone(880, 'sine', 0.05, 0.2), [playTone]);

    // Countdown: 3.. 2.. (Short) - Pulse
    const playCountdownShort = useCallback(() => playTone(660, 'sine', 0.15, 0.4), [playTone]);

    // Countdown: 1 (Long/Finish) - Sharp
    const playCountdownFinal = useCallback(() => playTone(440, 'square', 0.5, 0.3), [playTone]);

    const speak = useCallback((text) => {
        if (!window.speechSynthesis) return;
        // Cancel any ongoing speech to avoid overlap
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1; // Slightly faster for responsiveness
        window.speechSynthesis.speak(utterance);
    }, []);

    // Warning: Halfway point - Speech + Beep
    const playHalfway = useCallback(() => {
        playTone(523, 'sine', 0.1, 0.3);
        speak("Falta la mitad");
    }, [playTone, speak]);

    // Warning: 1 Minute - Speech + Beep
    const playMinuteWarning = useCallback(() => {
        playTone(330, 'triangle', 0.3, 0.4);
        speak("Un minuto");
    }, [playTone, speak]);

    const playSuccess = useCallback(() => {
        if (!audioCtx.current) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'sine', 0.15, 0.3), i * 100);
        });
    }, [playTone]);

    const playFailure = useCallback(() => playTone(150, 'sawtooth', 0.4, 0.45), [playTone]);

    // Exposed method to force resume context on user interaction
    const initAudio = useCallback(() => {
        if (!audioCtx.current) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) audioCtx.current = new AudioContext();
        }
        if (audioCtx.current && audioCtx.current.state === 'suspended') {
            console.log('Resuming AudioContext on user gesture');
            audioCtx.current.resume();
        }
    }, []);

    return {
        playTick,
        playCountdownShort,
        playCountdownFinal,
        playHalfway,
        playMinuteWarning,
        playSuccess,
        playFailure,
        initAudio,
        speak
    };
};
