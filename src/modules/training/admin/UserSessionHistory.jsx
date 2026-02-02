import React, { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { X, Calendar, Trophy, ChevronRight, Search, Clock, Zap, MessageSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import SessionResultsModal from '../components/SessionResultsModal';

const UserSessionHistory = ({ user, onClose, isEmbedded = false }) => {
    const [history, setHistory] = useState([]);
    const [sessionsMap, setSessionsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedResults, setSelectedResults] = useState(null);

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        try {
            setLoading(true);
            // 1. Fetch user data for schedule
            const [userData, allSessions, logHistory] = await Promise.all([
                TrainingDB.users.getById(user.id),
                TrainingDB.sessions.getAll(),
                TrainingDB.logs.getFeedbackLogs(user.id)
            ]);

            const schedule = userData?.schedule || {};

            // 2. Map sessions metadata
            const sMap = {};
            allSessions.forEach(s => sMap[s.id] = s);
            setSessionsMap(sMap);

            // 3. Extract completed sessions from schedule
            const completed = [];
            Object.entries(schedule).forEach(([date, tasks]) => {
                tasks.forEach(task => {
                    if (task.type === 'session' && task.status === 'completed') {
                        completed.push({
                            ...task,
                            scheduledDate: date,
                            session: sMap[task.sessionId]
                        });
                    }
                });
            });

            // 4. DATA RECOVERY: Add sessions that have logs but aren't in schedule as "completed"
            // This handles cases where the session was saved but the schedule update failed
            logHistory.forEach(log => {
                if (!log.sessionId) return;

                // Check if we already have this session/date in the completed list
                const exists = completed.some(c =>
                    c.sessionId === log.sessionId &&
                    c.scheduledDate === log.scheduledDate
                );

                if (!exists) {
                    completed.push({
                        id: `recovered-${log.id}`,
                        sessionId: log.sessionId,
                        type: 'session',
                        status: 'completed',
                        summary: log.summary || `${log.metrics?.durationMinutes || '?'} min (Recuperada)`,
                        results: {
                            durationMinutes: log.metrics?.durationMinutes || log.durationMinutes,
                            rpe: log.rpe,
                            notes: log.notes || log.comment,
                            analysis: log.analysis,
                            metrics: log.metrics,
                            totalVolume: log.metrics?.totalVolume,
                            evidenceUrl: log.evidenceUrl
                        },
                        scheduledDate: log.scheduledDate || format(new Date(log.timestamp), 'yyyy-MM-dd'),
                        session: sMap[log.sessionId],
                        isRecovered: true
                    });
                }
            });

            // Sort by date (newest first)
            completed.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
            setHistory(completed);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item =>
        (item.session?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.scheduledDate.includes(searchTerm)
    );

    const content = (
        <>
            {/* Header */}
            {!isEmbedded && (
                <header className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                            <X size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">{user.displayName}</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Historial de Entrenamientos</p>
                        </div>
                    </div>

                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por sesión o fecha..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-900 transition-colors w-64"
                        />
                    </div>
                </header>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
                <div className="max-w-3xl mx-auto space-y-4">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-500 font-bold text-sm uppercase tracking-widest">Cargando Historial...</p>
                        </div>
                    ) : filteredHistory.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200 p-8">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trophy size={32} className="text-slate-300" />
                            </div>
                            <p className="text-slate-400 font-bold">No hay entrenamientos completados aún.</p>
                        </div>
                    ) : (
                        filteredHistory.map((item, idx) => (
                            <motion.button
                                key={`${item.scheduledDate}-${item.id || idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => setSelectedResults(item)}
                                className={`w-full bg-white p-5 rounded-3xl border shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex items-center gap-4 text-left group ${item.isRecovered ? 'border-orange-100 bg-orange-50/10' : 'border-slate-100'}`}
                            >
                                <div className={`w-14 h-14 ${item.isRecovered ? 'bg-orange-500 shadow-orange-500/20' : 'bg-emerald-500 shadow-emerald-500/20'} text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0`}>
                                    <Clock size={28} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black ${item.isRecovered ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50'} px-2 py-0.5 rounded uppercase tracking-wider`}>
                                            {format(parseISO(item.scheduledDate), 'dd MMM yyyy', { locale: es })}
                                        </span>
                                        {item.isRecovered && (
                                            <span className="text-[10px] font-black text-orange-400 bg-white border border-orange-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                                <Zap size={10} /> Recuperada
                                            </span>
                                        )}
                                        {item.results?.rpe && (
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">RPE {item.results.rpe}</span>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 truncate">
                                        {item.session?.name || 'Sesión sin nombre'}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock size={12} />
                                            <span className="text-xs font-bold">{item.results?.durationMinutes || '--'} min</span>
                                        </div>
                                        {item.summary && (
                                            <div className="flex items-center gap-1">
                                                <Zap size={12} className={item.isRecovered ? 'text-orange-500' : 'text-amber-500'} />
                                                <span className={`text-xs font-bold truncate max-w-[150px] ${item.isRecovered ? 'text-orange-600' : 'text-amber-600'}`}>{item.summary}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <ChevronRight size={20} />
                                </div>
                            </motion.button>
                        ))
                    )}
                </div>
            </div>

            {/* Modal de Resultados */}
            <AnimatePresence>
                {selectedResults && (
                    <SessionResultsModal
                        task={selectedResults}
                        session={selectedResults.session}
                        onClose={() => setSelectedResults(null)}
                        userId={user.id}
                    />
                )}
            </AnimatePresence>
        </>
    );

    if (isEmbedded) return content;

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {content}
        </div>
    );
};

export default UserSessionHistory;
