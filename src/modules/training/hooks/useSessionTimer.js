import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * A robust timer hook that tracks elapsed time using Date.now() deltas.
 * This ensures accuracy even if the browser is backgrounded or throttled.
 * 
 * @param {number} initialTime - Starting time in seconds (default 0)
 * @param {boolean} startImmediately - Whether to start running immediately (default false)
 * @returns {object} Timer controls and state
 */
export const useSessionTimer = (initialTime = 0, startImmediately = false) => {
    const [elapsed, setElapsed] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(startImmediately);

    // Store the start timestamp of the current active period
    // or the "virtual" start time if we resumed from a pause
    const startTimeRef = useRef(null);
    const accumulatedRef = useRef(initialTime);

    const start = useCallback(() => {
        if (isRunning) return;

        setIsRunning(true);
        // If we have accumulated time (from previous runs), we behave as if 
        // we started earlier by that amount.
        startTimeRef.current = Date.now() - (accumulatedRef.current * 1000);
    }, [isRunning]);

    const pause = useCallback(() => {
        if (!isRunning) return;

        setIsRunning(false);
        // Check actual elapsed time one last time to freeze it accurately
        if (startTimeRef.current) {
            const now = Date.now();
            const currentSessionElapsed = (now - startTimeRef.current) / 1000;
            accumulatedRef.current = currentSessionElapsed;
            setElapsed(Math.floor(currentSessionElapsed));
        }
        startTimeRef.current = null;
    }, [isRunning]);

    const reset = useCallback((newTime = 0) => {
        setIsRunning(false);
        setElapsed(newTime);
        accumulatedRef.current = newTime;
        startTimeRef.current = null;
    }, []);

    // Manual override (e.g. for syncing)
    const setTime = useCallback((time) => {
        setElapsed(time);
        accumulatedRef.current = time;
        if (isRunning) {
            // Adjust start time to maintain continuity
            startTimeRef.current = Date.now() - (time * 1000);
        }
    }, [isRunning]);

    useEffect(() => {
        let interval = null;

        if (isRunning && startTimeRef.current) {
            interval = setInterval(() => {
                const now = Date.now();
                const totalElapsed = (now - startTimeRef.current) / 1000;

                // Only update state if the integer second has changed
                // to avoid unnecessary re-renders
                const floored = Math.floor(totalElapsed);
                setElapsed(prev => {
                    if (prev !== floored) return floored;
                    return prev;
                });
            }, 250); // 4Hz check for responsiveness
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isRunning]);

    return {
        elapsed,
        isRunning,
        start,
        pause,
        reset,
        setTime
    };
};
