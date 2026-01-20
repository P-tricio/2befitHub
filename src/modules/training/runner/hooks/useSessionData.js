/**
 * useSessionData Hook
 * Custom hook for loading and managing session data
 */

import { useState, useEffect } from 'react';
import { TrainingDB } from '../../services/db.js';
import { parseSession } from '../utils/sessionParser.js';

/**
 * Loads and parses session data
 * @param {string} sessionId - Session ID to load
 * @returns {Object} { session, modules, timeline, protocol, loading, error }
 */
export const useSessionData = (sessionId) => {
    const [state, setState] = useState({
        session: null,
        modules: [],
        timeline: [],
        protocol: 'mix',
        loading: true,
        error: null
    });

    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            try {
                setState(prev => ({ ...prev, loading: true, error: null }));

                // Fetch session data
                const sessionData = await TrainingDB.sessions.getById(sessionId);
                if (!sessionData) {
                    throw new Error('Sesión no encontrada');
                }

                // Parse session (handles both formats)
                const { modules, timeline, protocol } = await parseSession(sessionData);

                if (isMounted) {
                    setState({
                        session: sessionData,
                        modules,
                        timeline,
                        protocol,
                        loading: false,
                        error: null
                    });
                }
            } catch (err) {
                console.error('Error loading session:', err);
                if (isMounted) {
                    setState(prev => ({
                        ...prev,
                        loading: false,
                        error: err.message
                    }));
                }
            }
        };

        loadSession();

        return () => {
            isMounted = false;
        };
    }, [sessionId]);

    return state;
};
