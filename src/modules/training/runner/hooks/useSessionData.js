/**
 * useSessionData Hook
 * Custom hook for loading and managing session data
 */

import { useState, useEffect } from 'react';
import { TrainingDB } from '../../services/db.js';
import { parseSession } from '../utils/sessionParser.js';

/**
 * Loads and parses session data, including module history
 * @param {string} sessionId - Session ID to load
 * @param {string} userId - Current user ID for history fetching
 * @returns {Object} { session, modules, timeline, protocol, history, loading, error }
 */
export const useSessionData = (sessionId, userId) => {
    const [state, setState] = useState({
        session: null,
        modules: [],
        timeline: [],
        protocol: 'mix',
        history: {}, // { moduleId: lastLogDoc }
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

                // Fetch historical performance for all modules to support adjustment triggers
                const historyMap = {};
                if (userId && modules.length > 0) {
                    const uniqueModules = Array.from(new Set(modules.map(m => m.id)));
                    await Promise.all(
                        uniqueModules.map(async (modId) => {
                            const mod = modules.find(m => m.id === modId);
                            const lastLog = await TrainingDB.logs.getLastLog(userId, modId, mod?.stableId);
                            if (lastLog) {
                                historyMap[modId] = lastLog;
                            }
                        })
                    );
                }

                if (isMounted) {
                    setState({
                        session: sessionData,
                        modules,
                        timeline,
                        protocol,
                        history: historyMap,
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

        if (sessionId) {
            loadSession();
        }

        return () => {
            isMounted = false;
        };
    }, [sessionId, userId]);

    return state;
};
