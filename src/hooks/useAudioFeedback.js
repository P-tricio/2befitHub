import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook for robust audio feedback using Web Audio API.
 * Handles AudioContext lifecycle and provides standard sound patterns.
 * Includes vibration as backup for silent mode.
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

    // Helper for vibration (works on Android, limited on iOS)
    const vibrate = useCallback((pattern) => {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }, []);

    // Helper to generic oscillator beep
    const playTone = useCallback((freq, type = 'sine', duration = 0.1, volume = 0.5) => {
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
    const playTick = useCallback(() => {
        playTone(880, 'sine', 0.05, 0.4);
        vibrate(30);
    }, [playTone, vibrate]);

    // Countdown: 3.. 2.. (Short) - Pulse
    const playCountdownShort = useCallback(() => {
        playTone(660, 'sine', 0.15, 0.8);
        vibrate(100);
    }, [playTone, vibrate]);

    // Countdown: 1 (Long/Finish) - Sharp
    const playCountdownFinal = useCallback(() => {
        playTone(440, 'square', 0.5, 0.6);
        vibrate([100, 50, 200]); // Pattern: vibrate-pause-vibrate
    }, [playTone, vibrate]);

    const speak = useCallback((text) => {
        if (!window.speechSynthesis) return;
        // Cancel any ongoing speech to avoid overlap
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        utterance.rate = 1.1; // Slightly faster for responsiveness
        window.speechSynthesis.speak(utterance);
    }, []);

    // Warning: Halfway point - Speech + Beep + Vibrate
    const playHalfway = useCallback(() => {
        playTone(523, 'sine', 0.1, 0.6);
        vibrate([100, 50, 100]); // Double pulse
        speak("Falta la mitad");
    }, [playTone, vibrate, speak]);

    // Warning: 1 Minute - Speech + Beep + Vibrate
    const playMinuteWarning = useCallback(() => {
        playTone(330, 'triangle', 0.3, 0.8);
        vibrate([150, 75, 150]); // Double pulse, slightly longer
        speak("Un minuto");
    }, [playTone, vibrate, speak]);

    const playSuccess = useCallback(() => {
        if (!audioCtx.current) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            setTimeout(() => playTone(freq, 'sine', 0.15, 0.6), i * 100);
        });
        // Victory pattern: escalating pulses
        vibrate([50, 30, 75, 30, 100, 30, 150]);
    }, [playTone, vibrate]);

    const playFailure = useCallback(() => {
        playTone(150, 'sawtooth', 0.4, 0.9);
        vibrate([300, 100, 300]); // Long-short-long error pattern
    }, [playTone, vibrate]);

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
        speak,
        vibrate
    };
};
