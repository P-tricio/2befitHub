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
    const playTone = useCallback((freq, type = 'sine', duration = 0.1, volume = 0.1) => {
        if (!audioCtx.current) return;

        // Resume context if suspended (browser autoplay policy)
        if (audioCtx.current.state === 'suspended') {
            audioCtx.current.resume().catch(console.error);
        }

        const osc = audioCtx.current.createOscillator();
        const gain = audioCtx.current.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.current.currentTime);

        gain.gain.setValueAtTime(volume, audioCtx.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.current.currentTime + duration);

        osc.connect(gain);
        gain.connect(audioCtx.current.destination);

        osc.start();
        osc.stop(audioCtx.current.currentTime + duration);
    }, []);

    // Patterns
    const playTick = useCallback(() => playTone(880, 'sine', 0.05, 0.05), [playTone]); // Subtle tick

    // Countdown: 3.. 2.. (Short)
    const playCountdownShort = useCallback(() => playTone(660, 'sine', 0.1, 0.1), [playTone]);

    // Countdown: 1 (Long/Finish)
    const playCountdownFinal = useCallback(() => playTone(880, 'square', 0.4, 0.1), [playTone]); // BEEEEEP

    const playSuccess = useCallback(() => {
        if (!audioCtx.current) return;
        // Simple ascending arpeggio
        const now = audioCtx.current.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
            // We can't reuse playTone easily for sequence without timing, so manual inline here or generic sequencer
            setTimeout(() => playTone(freq, 'sine', 0.1, 0.1), i * 100);
        });
    }, [playTone]);

    const playFailure = useCallback(() => playTone(150, 'sawtooth', 0.4, 0.2), [playTone]);

    // Exposed method to force resume context on user interaction (e.g. Start Button)
    const initAudio = useCallback(() => {
        if (audioCtx.current && audioCtx.current.state === 'suspended') {
            console.log('Resuming AudioContext on user gesture');
            audioCtx.current.resume();
        }
    }, []);

    return {
        playTick,
        playCountdownShort,
        playCountdownFinal,
        playSuccess,
        playFailure,
        initAudio
    };
};
