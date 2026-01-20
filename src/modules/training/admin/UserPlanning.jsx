import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Search, Check, Dumbbell, Footprints, ClipboardList, Utensils, Layers, MoreVertical, Trash2, Copy, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingDB } from '../services/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const UserPlanning = ({ user, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [schedule, setSchedule] = useState({}); // { "YYYY-MM-DD": sessionId }
    const [sessions, setSessions] = useState([]);
    const [programs, setPrograms] = useState([]);

    // Drawers State
    const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
    const [programPickerOpen, setProgramPickerOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null); // Date to assign session to
    const [pickerSearch, setPickerSearch] = useState('');
    const [dayDetailOpen, setDayDetailOpen] = useState(false); // View existing tasks
    const [addTaskModalOpen, setAddTaskModalOpen] = useState(false); // Add new task

    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
    const [selectedTasks, setSelectedTasks] = useState([]); // Array of tasks for bulk delete

    useEffect(() => {
        loadData();
    }, [user.id]);

    const loadData = async () => {
        const [sessData, progData, userData] = await Promise.all([
            TrainingDB.sessions.getAll(),
            TrainingDB.programs.getAll(),
            // Reload user to get latest schedule
            // In MVP we might pass schedule as prop, but let's fetch to be safe
            TrainingDB.users.getAll().then(users => users.find(u => u.id === user.id))
        ]);

        setSessions(sessData);
        setPrograms(progData);
        // Ensure schedule is compatible (migrating string -> array if needed)
        const rawSchedule = userData?.schedule || {};
        const normalized = {};
        Object.keys(rawSchedule).forEach(date => {
            const val = rawSchedule[date];
            if (Array.isArray(val)) normalized[date] = val;
            else if (typeof val === 'string') normalized[date] = [{ type: 'session', id: val, sessionId: val }]; // Backwards compat
        });
        setSchedule(normalized);
    };

    // --- Helpers ---
    const getDaysInMonth = () => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return eachDayOfInterval({ start, end });
    };

    const getSessionName = (id) => sessions.find(s => s.id === id)?.name || 'Sesión';

    const getSessionDetails = (id) => {
        const session = sessions.find(s => s.id === id);
        if (!session) return { blocks: 0, duration: 0 };

        const blocks = session.blocks || [];
        let totalMinutes = 0;

        // Protocol-specific time caps per block (in minutes)
        // PDP-T: [4, 4, 5, 5, 6, 6] for [Boost, Base, Build A, Build B, Burn A, Burn B]
        // PDP-R: [5, 5, 6, 6, 7, 7] (+1 min more than PDP-T)
        const TIME_CAPS_T = [4, 4, 5, 5, 6, 6];
        const TIME_CAPS_R = [5, 5, 6, 6, 7, 7];
        const TIME_CAPS_E = [4, 4, 5, 5, 6, 6]; // Assuming same as T

        // Detect protocol from session name or blocks
        const sessionName = session.name || '';
        let timeCaps = TIME_CAPS_T; // default

        if (sessionName.includes('PDP-R')) {
            timeCaps = TIME_CAPS_R;
        } else if (sessionName.includes('PDP-E')) {
            timeCaps = TIME_CAPS_E;
        }

        // Add Blocks + Transition time (2 min after each block)
        blocks.forEach((block, idx) => {
            // Use protocol-specific time cap, fallback to targeting or defaults
            const defaultCap = timeCaps[idx] || 4;
            const timeCapMinutes = block.targeting?.[0]?.timeCap
                ? Math.ceil(block.targeting[0].timeCap / 60)
                : defaultCap;

            totalMinutes += timeCapMinutes;

            // Add transition time after each block (2 min)
            totalMinutes += 2;
        });

        return {
            blocks: blocks.length,
            duration: Math.round(totalMinutes)
        };
    };

    const getTaskIcon = (task) => {
        switch (task.type) {
            case 'session': return <Dumbbell size={16} className="text-slate-900" />;
            case 'neat': return <Footprints size={16} className="text-emerald-500" />;
            case 'nutrition': return <Utensils size={16} className="text-orange-400" />;
            case 'checkin': return <ClipboardList size={16} className="text-blue-500" />;
            default: return null;
        }
    };

    const getTaskName = (task) => {
        switch (task.type) {
            case 'session': return sessions.find(s => s.id === task.sessionId)?.name || 'Sesión de Entrenamiento';
            case 'neat': return task.title || 'Actividad NEAT';
            case 'nutrition': return task.title || 'Plan Nutricional';
            case 'checkin': return task.title || 'Control';
            default: return 'Tarea';
        }
    };

    // --- Actions ---
    const appendTask = async (date, newTask) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const currentTasks = schedule[dateKey] || [];
        const updatedTasks = [...currentTasks, newTask];

        await TrainingDB.users.appendSchedule(user.id, {
            [dateKey]: updatedTasks
        });

        setSchedule(prev => ({
            ...prev,
            [dateKey]: updatedTasks
        }));
    };

    const handleAssignSession = async (sessionId) => {
        if (!selectedDate) return;
        await appendTask(selectedDate, {
            id: crypto.randomUUID(),
            type: 'session',
            sessionId: sessionId
        });
        setAddTaskModalOpen(false);
    };

    const handleAssignProgram = async (programId) => {
        if (!selectedDate) return;

        const program = programs.find(p => p.id === programId);
        if (!program || !program.schedule) return;

        try {
            const startDate = selectedDate;
            const newScheduleItems = {};

            Object.entries(program.schedule).forEach(([slotId, sessionId]) => {
                const [wStr, dStr] = slotId.split('-');
                const weekNum = parseInt(wStr.replace('w', '')) - 1;
                const dayNum = parseInt(dStr.replace('d', ''));

                const dayOffset = (weekNum * 7) + dayNum;
                const targetDate = addDays(startDate, dayOffset);
                const dateKey = format(targetDate, 'yyyy-MM-dd');

                const currentTasks = newScheduleItems[dateKey] || schedule[dateKey] || [];
                const sessionIds = Array.isArray(sessionId) ? sessionId : [sessionId];

                const newTasksForDay = sessionIds.map(sid => ({
                    id: crypto.randomUUID(),
                    type: 'session',
                    sessionId: sid
                }));

                newScheduleItems[dateKey] = [...currentTasks, ...newTasksForDay];
            });

            await TrainingDB.users.appendSchedule(user.id, newScheduleItems);

            setSchedule(prev => ({
                ...prev,
                ...newScheduleItems
            }));

            setAddTaskModalOpen(false);
            alert(`Programa "${program.name}" asignado desde el ${format(startDate, 'dd/MM')}`);

        } catch (error) {
            console.error(error);
            alert('Error al asignar programa');
        }
    };

    const handleDateNumberClick = (day) => {
        setSelectedDate(day);
        setAddTaskModalOpen(true);
    };

    const handleDateContentClick = (day) => {
        setSelectedDate(day);
        setDayDetailOpen(true);
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('¿Eliminar tarea?')) return;
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const current = schedule[dateKey] || [];
        const updated = current.filter(t => t.id !== taskId);

        await TrainingDB.users.appendSchedule(user.id, { [dateKey]: updated });
        setSchedule(prev => ({ ...prev, [dateKey]: updated }));
    };

    const toggleTaskSelection = (taskId) => {
        setSelectedTasks(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`¿Eliminar ${selectedTasks.length} tareas?`)) return;

        const updates = {};
        const newSchedule = { ...schedule };

        Object.keys(newSchedule).forEach(dateKey => {
            const originalTasks = newSchedule[dateKey];
            const filteredTasks = originalTasks.filter(t => !selectedTasks.includes(t.id));

            if (originalTasks.length !== filteredTasks.length) {
                newSchedule[dateKey] = filteredTasks;
                updates[dateKey] = filteredTasks;
            }
        });

        await TrainingDB.users.appendSchedule(user.id, updates);
        setSchedule(newSchedule);
        setSelectedTasks([]);
    };

    // Select All Logic
    const handleSelectAll = () => {
        // Check if all current month tasks are selected
        const days = getDaysInMonth();
        let allTaskIds = [];
        days.forEach(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const tasks = schedule[dateKey] || [];
            tasks.forEach(t => allTaskIds.push(t.id));
        });

        if (allTaskIds.length === 0) return;

        const isAllSelected = allTaskIds.every(id => selectedTasks.includes(id));

        if (isAllSelected) {
            setSelectedTasks([]);
        } else {
            setSelectedTasks(allTaskIds);
        }
    };

    const handleDeleteTaskInList = async (date, taskId) => {
        if (!window.confirm('¿Eliminar tarea?')) return;
        const dateKey = format(date, 'yyyy-MM-dd');
        const current = schedule[dateKey] || [];
        const updated = current.filter(t => t.id !== taskId);

        await TrainingDB.users.appendSchedule(user.id, { [dateKey]: updated });
        setSchedule(prev => ({ ...prev, [dateKey]: updated }));
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 shrink-0">
                        <ChevronLeft size={24} />
                    </button>
                    <div className="min-w-0">
                        <h2 className="text-xl font-black text-slate-900 truncate">{user.displayName}</h2>
                        <p className="text-xs text-slate-500 truncate">Planificación de Entrenamientos</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => { setSelectedDate(new Date()); setAddTaskModalOpen(true); }}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Añadir</span>
                    </button>
                </div>
            </div>

            {/* Calendar Controls */}
            <div className="flex items-center justify-between p-6 max-w-5xl mx-auto w-full">
                <h3 className="text-2xl font-black capitalize text-slate-900">
                    {format(currentDate, 'MMMM yyyy', { locale: es })}
                </h3>
                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <Calendar size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <div className="flex flex-col gap-[2px]">
                                <div className="w-4 h-[2px] bg-current rounded-full" />
                                <div className="w-4 h-[2px] bg-current rounded-full" />
                                <div className="w-4 h-[2px] bg-current rounded-full" />
                            </div>
                        </button>
                    </div>

                    <div className="h-6 w-[1px] bg-slate-200" />

                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm font-bold hover:bg-slate-100 rounded-lg border border-slate-200">
                            Hoy
                        </button>
                        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-100 rounded-lg">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Select All Action (List Mode Only) */}
            {viewMode === 'list' && (
                <div className="px-6 pb-2 flex justify-end">
                    <button
                        onClick={handleSelectAll}
                        className="text-xs font-bold text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
                    >
                        <Check size={14} />
                        {selectedTasks.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                </div>
            )}

            {/* Calendar Grid OR List View */}
            <div className="flex-1 overflow-y-auto p-6 pt-0">
                <div className="max-w-5xl mx-auto pb-20">
                    {viewMode === 'calendar' ? (
                        <>
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 mb-2">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                    <div key={d} className="text-center text-xs font-black text-slate-400 py-2">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Days */}
                            <div className="grid grid-cols-7 gap-2 auto-rows-[120px]">
                                {/* Empty slots for start of month alignment (Mon start) */}
                                {Array.from({ length: (getDay(startOfMonth(currentDate)) + 6) % 7 }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}

                                {getDaysInMonth().map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const isToday = isSameDay(day, new Date());
                                    const tasks = schedule[dateKey] || [];

                                    return (
                                        <div
                                            key={dateKey}
                                            className={`
                                                rounded-2xl border transition-all flex flex-col gap-1 overflow-hidden relative group
                                                ${isToday ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-100 bg-white hover:border-slate-300'}
                                            `}
                                        >
                                            {/* Number Area - Click to Add */}
                                            <div
                                                onClick={(e) => { e.stopPropagation(); handleDateNumberClick(day); }}
                                                className={`
                                                    p-2 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition-colors
                                                    ${isToday ? 'bg-emerald-50' : ''}
                                                `}
                                            >
                                                <span className={`
                                                    text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                                                    ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-700'}
                                                `}>
                                                    {format(day, 'd')}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 text-slate-400">
                                                    <Plus size={14} />
                                                </div>
                                            </div>

                                            {/* Content Area - Click to View Details */}
                                            <div
                                                onClick={() => handleDateContentClick(day)}
                                                className="flex-1 p-2 pt-0 cursor-pointer flex flex-col gap-1 min-h-[60px]"
                                            >
                                                {tasks.map((task, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 overflow-hidden">
                                                        <div className="shrink-0">{getTaskIcon(task)}</div>
                                                        <span className="text-[10px] font-medium text-slate-600 truncate leading-tight">
                                                            {getTaskName(task)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {!tasks.length && (
                                                    <div className="flex-1 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                        <span className="text-[10px] text-slate-400">Ver detalles</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        // LIST VIEW
                        <div className="space-y-6">
                            {getDaysInMonth()
                                .filter(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    return schedule[dateKey] && schedule[dateKey].length > 0;
                                })
                                .map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const tasks = schedule[dateKey];
                                    const isToday = isSameDay(day, new Date());

                                    return (
                                        <div key={dateKey} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                            {/* Day Header */}
                                            <div className={`p-4 border-b border-slate-50 flex items-center gap-3 ${isToday ? 'bg-emerald-50/50' : 'bg-slate-50/50'}`}>
                                                <div className={`
                                                    w-10 h-10 rounded-xl flex flex-col items-center justify-center leading-none
                                                    ${isToday ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-white border border-slate-200 text-slate-700'}
                                                `}>
                                                    <span className="text-xs uppercase font-bold opacity-60">{format(day, 'EEE', { locale: es })}</span>
                                                    <span className="text-lg font-black">{format(day, 'd')}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900 capitalize">{format(day, 'MMMM yyyy', { locale: es })}</h4>
                                                    <p className="text-xs text-slate-500">{tasks.length} tareas planificadas</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDateNumberClick(day)}
                                                    className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>

                                            {/* Task List */}
                                            <div className="divide-y divide-slate-50">
                                                {tasks.map(task => {
                                                    const isSelected = selectedTasks.includes(task.id);
                                                    return (
                                                        <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                                            {/* Checkbox */}
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleTaskSelection(task.id)}
                                                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 transition-all checked:border-blue-500 checked:bg-blue-500 hover:border-blue-400"
                                                                />
                                                                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
                                                                    <Check size={12} strokeWidth={3} />
                                                                </div>
                                                            </div>

                                                            {/* Icon */}
                                                            <div className={`
                                                                w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0
                                                                ${task.type === 'session' ? 'bg-slate-900' : ''}
                                                                ${task.type === 'neat' ? 'bg-emerald-500' : ''}
                                                                ${task.type === 'nutrition' ? 'bg-orange-400' : ''}
                                                                ${task.type === 'checkin' ? 'bg-blue-500' : ''}
                                                            `}>
                                                                {task.type === 'session' && <Dumbbell size={18} />}
                                                                {task.type === 'neat' && <Footprints size={18} />}
                                                                {task.type === 'nutrition' && <Utensils size={18} />}
                                                                {task.type === 'checkin' && <ClipboardList size={18} />}
                                                            </div>

                                                            {/* Details */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-bold text-slate-900 truncate">
                                                                    {task.type === 'session' ? getSessionName(task.sessionId) : task.title}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {task.type === 'session' && (() => {
                                                                        const details = getSessionDetails(task.sessionId);
                                                                        return `${details.blocks} bloques • ~${details.duration} min`;
                                                                    })()}
                                                                    {task.type === 'neat' && 'NEAT'}
                                                                    {task.type === 'nutrition' && 'Nutrición'}
                                                                    {task.type === 'checkin' && 'Control'}
                                                                </div>
                                                            </div>

                                                            {/* Individual Action (optional, keeping minimal for bulk focus) */}
                                                            <button
                                                                onClick={() => handleDeleteTaskInList(day, task.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-colors px-2"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            {getDaysInMonth().filter(day => schedule[format(day, 'yyyy-MM-dd')]?.length > 0).length === 0 && (
                                <div className="text-center py-20">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                        <Calendar size={32} />
                                    </div>
                                    <h3 className="text-slate-900 font-bold mb-1">Sin tareas este mes</h3>
                                    <p className="text-slate-500 text-sm">Cambia al modo calendario o usa el botón Añadir</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Delete Floating Button */}
            <AnimatePresence>
                {selectedTasks.length > 0 && (
                    <motion.div
                        key="bulk-delete-btn"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full shadow-xl shadow-red-500/30 font-bold flex items-center gap-3 transition-colors"
                        >
                            <Trash2 size={20} />
                            <span>Eliminar {selectedTasks.length} seleccionados</span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ADD TASK MODAL (Accordion Style) */}
            <AnimatePresence>
                {addTaskModalOpen && selectedDate && (
                    <AddTaskModal
                        date={selectedDate}
                        sessions={sessions}
                        programs={programs}
                        onClose={() => setAddTaskModalOpen(false)}
                        onAssignSession={handleAssignSession}
                        onAssignProgram={handleAssignProgram}
                        onAssignGeneric={(type) => {
                            appendTask(selectedDate, {
                                id: crypto.randomUUID(),
                                type,
                                title: type === 'neat' ? 'Objetivo Pasos' : (type === 'nutrition' ? 'Plan Nutricional' : 'Control'),
                                completed: false
                            });
                            setAddTaskModalOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* DAY DETAIL MODAL */}
            <AnimatePresence>
                {dayDetailOpen && selectedDate && (
                    <DayDetailModal
                        date={selectedDate}
                        tasks={schedule[format(selectedDate, 'yyyy-MM-dd')] || []}
                        onClose={() => setDayDetailOpen(false)}
                        onAddSession={() => { setDayDetailOpen(false); setAddTaskModalOpen(true); }}
                        onAddProgram={() => { setDayDetailOpen(false); setAddTaskModalOpen(true); }}
                        onAddGeneric={(type) => {
                            setDayDetailOpen(false);
                            setAddTaskModalOpen(true);
                        }}
                        onDeleteTask={handleDeleteTask}
                        getSessionName={getSessionName}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Sub-component for Day Details
const DayDetailModal = ({ date, tasks, onClose, onAddSession, onAddProgram, onAddGeneric, onDeleteTask, getSessionName }) => {
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-[210] flex flex-col max-h-[85vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">{format(date, 'yyyy')}</div>
                        <h3 className="text-2xl font-black text-slate-900 capitalize">{format(date, 'EEEE d, MMMM', { locale: es })}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Content - Just list tasks, no Add Grid here anymore (user asked for add modal separately, but redundant links are fine) 
                    Actually user said: "Si se pulsa abajo... listado ampliado" implies READ ONLY or MANAGE EXISTING. 
                    Adding new stuff is via NUMBER click. 
                    I'll keep specific actions just in case but maybe minimize them.
                */}
                <div className="flex-1 overflow-y-auto p-6 pb-12 space-y-6">
                    {/* Existing Tasks */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-xs font-bold text-slate-400 uppercase">Planificado</h4>
                            <button onClick={onAddSession} className="text-xs font-bold text-emerald-600 hover:underline">
                                + Añadir Nuevo
                            </button>
                        </div>
                        <div className="space-y-3">
                            {tasks.length === 0 && (
                                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-sm">
                                    No hay tareas para este día
                                </div>
                            )}
                            {tasks.map(task => (
                                <div key={task.id} className="p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                        ${task.type === 'session' ? 'bg-slate-900' : ''}
                                        ${task.type === 'neat' ? 'bg-emerald-500' : ''}
                                        ${task.type === 'nutrition' ? 'bg-orange-400' : ''}
                                        ${task.type === 'checkin' ? 'bg-blue-500' : ''}
                                    `}>
                                        {task.type === 'session' && <Dumbbell size={18} />}
                                        {task.type === 'neat' && <Footprints size={18} />}
                                        {task.type === 'nutrition' && <Utensils size={18} />}
                                        {task.type === 'checkin' && <ClipboardList size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900">
                                            {task.type === 'session' ? getSessionName(task.sessionId) : task.title}
                                        </div>
                                        <div className="text-xs text-slate-500 capitalize">
                                            {task.type === 'session' ? (() => {
                                                const details = getSessionDetails(task.session?.id || task.sessionId);
                                                return `${details.blocks} bloques • ~${details.duration} min`;
                                            })() : task.type}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onDeleteTask(task.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                        <button className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Simplified Actions Footer */}
            </motion.div>
        </div>
    );
};

// Add Task Modal with Accordion
const AddTaskModal = ({ date, sessions, programs, onClose, onAssignSession, onAssignProgram, onAssignGeneric }) => {
    const [expanded, setExpanded] = useState(null);
    const [search, setSearch] = useState('');

    const toggle = (id) => { setSearch(''); setExpanded(expanded === id ? null : id); };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl z-[210] flex flex-col max-h-[85vh] overflow-hidden"
            >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">Añadir Tarea</h3>
                        <p className="text-xs text-slate-500">Para {format(date, 'd MMMM', { locale: es })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* ENTRENAMIENTO */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                        <button
                            onClick={() => toggle('session')}
                            className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === 'session' ? 'bg-slate-50' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Dumbbell size={20} className="text-slate-900" />
                                <span>Entrenamiento</span>
                            </div>
                            <ChevronRight size={20} className={`transition-transform ${expanded === 'session' ? 'rotate-90' : ''}`} />
                        </button>

                        {expanded === 'session' && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-white p-2 rounded-xl flex items-center gap-2 border border-slate-200 mb-2">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar sesión..."
                                        className="w-full bg-transparent outline-none text-sm"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {sessions.filter(s => s.name.toLowerCase().includes(search.toLowerCase())).map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => onAssignSession(s.id)}
                                            className="w-full text-left p-3 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 text-sm font-medium transition-colors"
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PROGRAMA */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                        <button
                            onClick={() => toggle('program')}
                            className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === 'program' ? 'bg-slate-50' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <Layers size={20} className="text-purple-600" />
                                <span>Programa / Macro</span>
                            </div>
                            <ChevronRight size={20} className={`transition-transform ${expanded === 'program' ? 'rotate-90' : ''}`} />
                        </button>
                        {expanded === 'program' && (
                            <div className="p-4 border-t border-slate-200 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                                <div className="bg-white p-2 rounded-xl flex items-center gap-2 border border-slate-200 mb-2">
                                    <Search size={16} className="text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar programa..."
                                        className="w-full bg-transparent outline-none text-sm"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {programs.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => onAssignProgram(p.id)}
                                            className="w-full text-left p-3 rounded-lg hover:bg-purple-50 hover:text-purple-700 text-sm font-medium transition-colors"
                                        >
                                            {p.name} <span className="text-slate-400 text-xs ml-2">({p.weeks} sem)</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GENERIC TYPES */}
                    {[
                        { id: 'neat', label: 'Neat / Pasos', icon: <Footprints size={20} className="text-emerald-600" /> },
                        { id: 'nutrition', label: 'Nutrición', icon: <Utensils size={20} className="text-orange-600" /> },
                        { id: 'checkin', label: 'Control / Seguimiento', icon: <ClipboardList size={20} className="text-blue-600" /> }
                    ].map(item => (
                        <div key={item.id} className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
                            <button
                                onClick={() => toggle(item.id)}
                                className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === item.id ? 'bg-slate-50' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <span>{item.label}</span>
                                </div>
                                <ChevronRight size={20} className={`transition-transform ${expanded === item.id ? 'rotate-90' : ''}`} />
                            </button>
                            {expanded === item.id && (
                                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                                    <button
                                        onClick={() => onAssignGeneric(item.id)}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
                                    >
                                        Añadir {item.label}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default UserPlanning;
