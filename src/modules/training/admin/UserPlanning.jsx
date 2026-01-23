import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Search, Check, Dumbbell, Footprints, ClipboardList, Utensils, Layers, MoreVertical, Trash2, Copy, Edit2, ArrowRight, Copy as DuplicateIcon, Scale, Ruler, Camera, Settings2, FileText, Zap, CheckSquare, Package, ListFilter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrainingDB } from '../services/db';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, addDays, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import SessionResultsModal from '../components/SessionResultsModal';
import TaskResultsModal from '../components/TaskResultsModal';
import FormCreator from './FormCreator';

const UserPlanning = ({ user, onClose, isEmbedded = false }) => {
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
    const [editingTask, setEditingTask] = useState(null); // Task being edited

    // Drag & Drop State
    const [dragActionModal, setDragActionModal] = useState({
        isOpen: false,
        task: null,
        sourceDate: null,
        targetDate: null
    });

    const [sessionResultsTask, setSessionResultsTask] = useState(null);
    const [taskResultsTask, setTaskResultsTask] = useState(null);
    const [isFormCreatorOpen, setIsFormCreatorOpen] = useState(false);
    const [availableForms, setAvailableForms] = useState([]);

    useEffect(() => {
        loadData();
        loadForms();
    }, [user.id]);

    const loadForms = async () => {
        try {
            const forms = await TrainingDB.forms.getAll();
            setAvailableForms(forms);
        } catch (e) {
            console.error(e);
        }
    };

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
        const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
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
            case 'nutrition': return <CheckSquare size={16} className="text-orange-400" />;
            case 'tracking': return <ClipboardList size={16} className="text-blue-500" />;
            default: return null;
        }
    };

    const getTaskName = (task) => {
        switch (task.type) {
            case 'session': return sessions.find(s => s.id === task.sessionId)?.name || 'Sesión de Entrenamiento';
            case 'neat': return task.title || 'Actividad NEAT';
            case 'nutrition': return task.title || (task.config?.category ? `Hábitos ${task.config.category}` : 'Hábitos');
            case 'tracking': return task.title || 'Seguimiento';
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
            sessionId: sessionId,
            admin_assigned: true
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
                    sessionId: sid,
                    admin_assigned: true
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
        setEditingTask(null);
        setSelectedDate(day);
        setDayDetailOpen(true);
    };

    const handleUpdateTask = async (taskId, updatedConfig) => {
        const dateKey = format(selectedDate, 'yyyy-MM-dd');
        const current = schedule[dateKey] || [];
        const updated = current.map(t => t.id === taskId ? { ...t, config: updatedConfig } : t);

        await TrainingDB.users.appendSchedule(user.id, { [dateKey]: updated });
        setSchedule(prev => ({ ...prev, [dateKey]: updated }));
        setEditingTask(null);
        setAddTaskModalOpen(false);
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

    // --- Drag & Drop Handlers ---
    const handleTaskDragEnd = (event, info, task, sourceDate) => {
        const dropPoint = {
            x: info.point.x,
            y: info.point.y
        };

        const elements = document.elementsFromPoint(dropPoint.x, dropPoint.y);
        const dayCell = elements.find(el => el.hasAttribute('data-date'));

        if (dayCell) {
            const targetDateStr = dayCell.getAttribute('data-date');
            const sourceDateStr = format(sourceDate, 'yyyy-MM-dd');

            if (targetDateStr !== sourceDateStr) {
                // Open Action Modal
                setDragActionModal({
                    isOpen: true,
                    task: task,
                    sourceDate: sourceDate,
                    targetDate: new Date(targetDateStr) // Assuming safe parsing or use parseISO
                });
            }
        }
    };

    const handleConfirmMove = async () => {
        const { task, sourceDate, targetDate } = dragActionModal;
        if (!task || !sourceDate || !targetDate) return;

        const sourceKey = format(sourceDate, 'yyyy-MM-dd');
        const targetKey = format(targetDate, 'yyyy-MM-dd');

        // 1. Remove from source
        const sourceTasks = schedule[sourceKey] || [];
        const updatedSourceTasks = sourceTasks.filter(t => t.id !== task.id);

        // 2. Add to target
        const targetTasks = schedule[targetKey] || [];
        // Ensure unique ID if moving? No, keep same ID is fine for move, but good practice to maybe regen if we want perfect uniqueness logs, 
        // but for "Move", keeping ID is often desired. 
        // HOWEVER, if we want to avoid any conflict if ID is used as key in a list that might merge... 
        // Let's keep ID for move.
        const updatedTargetTasks = [...targetTasks, task];

        // Update DB
        await TrainingDB.users.appendSchedule(user.id, {
            [sourceKey]: updatedSourceTasks,
            [targetKey]: updatedTargetTasks
        });

        // Update State
        setSchedule(prev => ({
            ...prev,
            [sourceKey]: updatedSourceTasks,
            [targetKey]: updatedTargetTasks
        }));

        setDragActionModal({ isOpen: false, task: null, sourceDate: null, targetDate: null });
    };

    const handleConfirmDuplicate = async () => {
        const { task, targetDate } = dragActionModal;
        if (!task || !targetDate) return;

        const targetKey = format(targetDate, 'yyyy-MM-dd');

        // Create copy with new ID
        const newTask = {
            ...task,
            id: crypto.randomUUID()
        };

        const targetTasks = schedule[targetKey] || [];
        const updatedTargetTasks = [...targetTasks, newTask];

        // Update DB
        await TrainingDB.users.appendSchedule(user.id, {
            [targetKey]: updatedTargetTasks
        });

        // Update State
        setSchedule(prev => ({
            ...prev,
            [targetKey]: updatedTargetTasks
        }));

        setDragActionModal({ isOpen: false, task: null, sourceDate: null, targetDate: null });
    };

    const content = (
        <>
            {/* Header */}
            {!isEmbedded && (
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
            )}

            {/* Calendar Controls */}
            <div className="flex items-center justify-between py-2 px-2 max-w-full mx-auto w-full">
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
            <div className="flex-1 overflow-y-auto p-2 pt-0">
                <div className="w-full pb-20">
                    {viewMode === 'calendar' ? (
                        <>
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 mb-1 gap-1">
                                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
                                    <div key={d} className="text-center text-xs font-black text-slate-400 py-2">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Days */}
                            <div className="grid grid-cols-7 gap-1 auto-rows-[120px]">
                                {/* Empty slots for start of month alignment (Mon start) */}

                                {getDaysInMonth().map(day => {
                                    const dateKey = format(day, 'yyyy-MM-dd');
                                    const isToday = isSameDay(day, new Date());
                                    const isPast = day < startOfDay(new Date()) && !isToday;
                                    const isOutsideMonth = !isSameMonth(day, currentDate);
                                    const tasks = schedule[dateKey] || [];

                                    return (
                                        <div
                                            key={dateKey}
                                            data-date={dateKey}
                                            className={`
                                                rounded-lg border transition-all flex flex-col gap-1 relative group hover:z-10
                                                ${isToday ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-100 bg-white hover:border-slate-300'}
                                                ${isPast || isOutsideMonth ? 'opacity-60 grayscale-[0.5]' : ''}
                                                ${isOutsideMonth ? 'bg-slate-50/50' : ''}
                                            `}
                                        >
                                            {/* Number Area - Click to Add */}
                                            <div
                                                onClick={(e) => { e.stopPropagation(); handleDateNumberClick(day); }}
                                                className={`
                                                    p-1 flex justify-between items-start cursor-pointer hover:bg-slate-50 transition-colors
                                                    ${isToday ? 'bg-emerald-50' : ''}
                                                `}
                                            >
                                                <span className={`
                                                    text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full
                                                    ${isToday ? 'bg-emerald-500 text-white' : 'text-slate-700'}
                                                `}>
                                                    {format(day, 'd')}
                                                </span>
                                                <div className="opacity-0 group-hover:opacity-100 text-slate-400">
                                                    <Plus size={12} />
                                                </div>
                                            </div>

                                            <div
                                                onClick={() => handleDateContentClick(day)}
                                                className="flex-1 p-0 cursor-pointer flex flex-col gap-px min-h-[60px]"
                                            >
                                                {tasks.map((task, idx) => (
                                                    <motion.div
                                                        key={task.id || idx}
                                                        drag
                                                        dragSnapToOrigin
                                                        dragMomentum={false}
                                                        whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
                                                        onDragEnd={(e, info) => handleTaskDragEnd(e, info, task, day)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedDate(day);
                                                            setDayDetailOpen(true);
                                                        }} // Open detail when clicking a task
                                                        className={`
                                                            flex items-center gap-1 px-1 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing touch-none
                                                            ${task.type === 'session' ? (task.status === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-900 text-white') : ''}
                                                            ${task.type === 'neat' ? 'bg-emerald-500 text-white' : ''}
                                                            ${task.type === 'nutrition' ? 'bg-orange-500 text-white' : ''}
                                                            ${task.type === 'tracking' || task.type === 'checkin' ? 'bg-blue-500 text-white' : ''}
                                                        `}
                                                    >
                                                        <div className="shrink-0 opacity-90">
                                                            {task.status === 'completed' ? <Check size={10} className="text-white" strokeWidth={4} /> : (
                                                                <>
                                                                    {task.type === 'session' && <Dumbbell size={10} className="text-current" />}
                                                                    {task.type === 'neat' && <Footprints size={10} className="text-current" />}
                                                                    {task.type === 'nutrition' && <CheckSquare size={10} className="text-current" />}
                                                                    {(task.type === 'tracking' || task.type === 'checkin') && <ClipboardList size={10} className="text-current" />}
                                                                </>
                                                            )}
                                                        </div>
                                                        <span className="text-[9px] font-bold truncate leading-tight flex-1 select-none">
                                                            {getTaskName(task)}
                                                        </span>
                                                        {task.status === 'completed' && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (task.type === 'session') {
                                                                        setSessionResultsTask(task);
                                                                    } else {
                                                                        setTaskResultsTask(task);
                                                                    }
                                                                }}
                                                                className="ml-1 p-0.5 bg-white/20 rounded hover:bg-white/40 transition-colors"
                                                                title="Ver Resultados"
                                                            >
                                                                <Zap size={8} className="text-white" fill="white" />
                                                            </button>
                                                        )}
                                                    </motion.div>
                                                ))}
                                                {/* Spacer to push content up if needed or just empty space */}
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
                                                                ${task.type === 'nutrition' ? 'bg-orange-500' : ''}
                                                                ${task.type === 'checkin' ? 'bg-blue-500' : ''}
                                                            `}>
                                                                {task.status === 'completed' ? <Check size={18} strokeWidth={3} /> : (
                                                                    <>
                                                                        {task.type === 'session' && <Dumbbell size={18} />}
                                                                        {task.type === 'neat' && <Footprints size={18} />}
                                                                        {task.type === 'nutrition' && <CheckSquare size={18} />}
                                                                        {task.type === 'checkin' && <ClipboardList size={18} />}
                                                                    </>
                                                                )}
                                                            </div>

                                                            {/* Details */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`font-bold truncate ${task.status === 'completed' ? 'text-emerald-700' : 'text-slate-900'}`}>
                                                                    {task.type === 'session' ? getSessionName(task.sessionId) : task.title}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {task.status === 'completed' ? (
                                                                        <span className="text-emerald-600 font-bold">{task.summary || 'SESIÓN COMPLETADA'}</span>
                                                                    ) : (
                                                                        task.type === 'session' && (() => {
                                                                            const details = getSessionDetails(task.sessionId);
                                                                            return `${details.blocks} bloques • ~${details.duration} min`;
                                                                        })()
                                                                    )}
                                                                    {task.type === 'neat' && !task.status && 'NEAT'}
                                                                    {task.type === 'nutrition' && !task.status && 'Hábitos'}
                                                                    {task.type === 'checkin' && !task.status && 'Control'}
                                                                </div>
                                                            </div>

                                                            {/* Result Link for Admins */}
                                                            {task.status === 'completed' && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (task.type === 'session') {
                                                                            setSessionResultsTask(task);
                                                                        } else {
                                                                            setTaskResultsTask(task);
                                                                        }
                                                                    }}
                                                                    className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-200 transition-colors"
                                                                >
                                                                    Ver Datos
                                                                </button>
                                                            )}

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
                        user={user}
                        date={selectedDate}
                        sessions={sessions}
                        programs={programs}
                        availableForms={availableForms}
                        taskToEdit={editingTask}
                        onClose={() => {
                            setAddTaskModalOpen(false);
                            setEditingTask(null);
                        }}
                        onAssignSession={handleAssignSession}
                        onAssignProgram={handleAssignProgram}
                        onOpenForms={() => setIsFormCreatorOpen(true)}
                        getTaskName={getTaskName}
                        onUpdateTask={handleUpdateTask}
                        onAssignGeneric={(type, config = {}) => {
                            appendTask(selectedDate, {
                                id: crypto.randomUUID(),
                                type,
                                title: type === 'neat' ? 'Objetivo Movimiento'
                                    : (type === 'nutrition' ? (config.category ? `Hábitos: ${config.category}` : 'Hábitos')
                                        : (type === 'free_training' ? 'Entrenamiento Libre'
                                            : 'Seguimiento')),
                                completed: false,
                                config: config,
                                admin_assigned: true
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
                        onEditTask={(task) => {
                            setDayDetailOpen(false);
                            setEditingTask(task);
                            setAddTaskModalOpen(true);
                        }}
                        onDeleteTask={handleDeleteTask}
                        onViewResults={(task) => {
                            setDayDetailOpen(false);
                            setSessionResultsTask(task);
                        }}
                        onViewTaskResults={(task) => {
                            setDayDetailOpen(false);
                            setTaskResultsTask(task);
                        }}
                        getSessionName={getSessionName}
                        getSessionDetails={getSessionDetails}
                    />
                )}
            </AnimatePresence>

            {/* DRAG ACTION MODAL */}
            <AnimatePresence>
                {dragActionModal.isOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={() => setDragActionModal({ ...dragActionModal, isOpen: false })}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl z-[310] overflow-hidden p-6"
                        >
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-black text-slate-900 mb-2">Mover Tarea</h3>
                                <p className="text-sm text-slate-500">
                                    ¿Quieres mover o duplicar esta tarea al
                                    <strong className="text-slate-900"> {dragActionModal.targetDate && format(dragActionModal.targetDate, 'd MMMM', { locale: es })}</strong>?
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={handleConfirmMove}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                                        <ArrowRight size={20} />
                                    </div>
                                    <span className="font-bold text-slate-900 text-sm">Mover</span>
                                </button>

                                <button
                                    onClick={handleConfirmDuplicate}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-900 group-hover:scale-110 transition-transform">
                                        <DuplicateIcon size={20} />
                                    </div>
                                    <span className="font-bold text-slate-900 text-sm">Duplicar</span>
                                </button>
                            </div>

                            <button
                                onClick={() => setDragActionModal({ ...dragActionModal, isOpen: false })}
                                className="w-full mt-4 py-3 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
                            >
                                Cancelar
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Session Results Modal */}
            <AnimatePresence>
                {sessionResultsTask && (
                    <SessionResultsModal
                        task={sessionResultsTask}
                        session={sessions.find(s => s.id === sessionResultsTask.sessionId)}
                        userId={user.id}
                        onClose={() => setSessionResultsTask(null)}
                    />
                )}
            </AnimatePresence>
            {/* Task Results Modal */}
            <AnimatePresence>
                {taskResultsTask && (
                    <TaskResultsModal
                        task={taskResultsTask}
                        onClose={() => setTaskResultsTask(null)}
                    />
                )}
            </AnimatePresence>

            {/* Form Creator Modal */}
            <AnimatePresence>
                {isFormCreatorOpen && (
                    <FormCreator onClose={() => {
                        setIsFormCreatorOpen(false);
                        // Refresh forms list
                        TrainingDB.forms.getAll().then(setAvailableForms);
                    }} />
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

// Sub-component for Day Details
const DayDetailModal = ({ date, tasks, onClose, onAddSession, onAddProgram, onAddGeneric, onEditTask, onDeleteTask, onViewResults, onViewTaskResults, getSessionName, getSessionDetails }) => {
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
                                <div
                                    key={task.id}
                                    onClick={() => {
                                        if (task.results || task.status === 'completed') {
                                            if (task.type === 'session') {
                                                onViewResults(task);
                                            } else {
                                                onViewTaskResults(task);
                                            }
                                        } else {
                                            onEditTask(task);
                                        }
                                    }}
                                    className={`p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 group cursor-pointer hover:border-slate-900 transition-all ${(task.status === 'completed' || task.results) ? 'bg-slate-50' : ''}`}
                                >
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                                        ${task.type === 'session' ? 'bg-slate-900' : ''}
                                        ${task.type === 'neat' ? 'bg-emerald-500' : ''}
                                        ${task.type === 'nutrition' ? 'bg-orange-400' : ''}
                                        ${task.type === 'tracking' || task.type === 'checkin' ? 'bg-blue-500' : ''}
                                    `}>
                                        {task.type === 'session' && <Dumbbell size={18} />}
                                        {task.type === 'neat' && <Footprints size={18} />}
                                        {task.type === 'nutrition' && <CheckSquare size={18} />}
                                        {(task.type === 'tracking' || task.type === 'checkin') && <ClipboardList size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold text-slate-900">
                                                {task.type === 'session' ? getSessionName(task.sessionId) : task.title}
                                            </div>
                                            {task.status === 'completed' && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 capitalize">
                                            {task.type === 'session' ? (() => {
                                                const details = getSessionDetails(task.session?.id || task.sessionId);
                                                return `${details.blocks} bloques • ~${details.duration} min`;
                                            })() : task.type}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteTask(task.id);
                                            }}
                                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        {!((task.status === 'completed' || task.results)) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEditTask(task);
                                                }}
                                                className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
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
const AddTaskModal = ({ user, date, sessions, programs, availableForms, taskToEdit, onClose, onAssignSession, onAssignProgram, onAssignGeneric, onUpdateTask, onOpenForms, getTaskName }) => {
    const [expanded, setExpanded] = useState(taskToEdit ? taskToEdit.type : null);
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
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">{taskToEdit ? 'Editar Tarea' : format(date, 'yyyy')}</div>
                        <h3 className="text-2xl font-black text-slate-900 capitalize">
                            {taskToEdit ? (typeof getTaskName === 'function' ? getTaskName(taskToEdit) : 'Editar Tarea') : format(date, 'EEEE d, MMMM', { locale: es })}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={20} className="text-slate-600" />
                    </button>
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

                        <button
                            onClick={onOpenForms}
                            className="absolute right-12 top-4 p-1 text-slate-300 hover:text-emerald-500"
                            title="Gestionar Formularios"
                        >
                            <Settings2 size={16} />
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
                                            onClick={() => taskToEdit ? onUpdateTask(taskToEdit.id, { sessionId: s.id }) : onAssignSession(s.id)}
                                            className={`w-full text-left p-3 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 text-sm font-medium transition-colors ${taskToEdit?.sessionId === s.id ? 'bg-emerald-50 text-emerald-700 font-bold' : ''}`}
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
                    <GenericTaskSection
                        id="neat"
                        label="Movimiento / Pasos"
                        icon={<Footprints size={20} className="text-emerald-600" />}
                        expanded={expanded === 'neat'}
                        toggle={() => toggle('neat')}
                        onAssign={(config) => taskToEdit ? onUpdateTask(taskToEdit.id, config) : onAssignGeneric('neat', config)}
                        initialConfig={taskToEdit?.type === 'neat' ? taskToEdit.config : null}
                    />
                    <GenericTaskSection
                        id="nutrition"
                        label="Hábitos / Mínimos"
                        icon={<CheckSquare size={20} className="text-orange-600" />}
                        expanded={expanded === 'nutrition'}
                        toggle={() => toggle('nutrition')}
                        onAssign={(config) => taskToEdit ? onUpdateTask(taskToEdit.id, config) : onAssignGeneric('nutrition', config)}
                        initialConfig={taskToEdit?.type === 'nutrition' ? taskToEdit.config : null}
                        user={user}
                    />
                    <GenericTaskSection
                        id="tracking"
                        label="Seguimiento"
                        icon={<ClipboardList size={20} className="text-blue-600" />}
                        expanded={expanded === 'tracking'}
                        toggle={() => toggle('tracking')}
                        onAssign={(config) => taskToEdit ? onUpdateTask(taskToEdit.id, config) : onAssignGeneric('tracking', config)}
                        availableForms={availableForms}
                        initialConfig={taskToEdit?.type === 'tracking' || taskToEdit?.type === 'checkin' ? taskToEdit.config : null}
                        isEdit={!!taskToEdit}
                    />

                    <GenericTaskSection
                        id="free_training"
                        label="Entrenamiento Libre"
                        icon={<Dumbbell size={20} className="text-slate-600" />}
                        expanded={expanded === 'free_training'}
                        toggle={() => toggle('free_training')}
                        onAssign={(config) => taskToEdit ? onUpdateTask(taskToEdit.id, config) : onAssignGeneric('free_training', config)}
                        initialConfig={taskToEdit?.type === 'free_training' ? taskToEdit.config : null}
                    />
                </div>
            </motion.div>
        </div>
    );
};

const GenericTaskSection = ({ id, label, icon, expanded, toggle, onAssign, availableForms, initialConfig, isEdit, user }) => {
    const [config, setConfig] = useState(initialConfig || {});

    // Default configs
    useEffect(() => {
        if (initialConfig) {
            setConfig(initialConfig);
            return;
        }
        if (id === 'neat') setConfig({ type: 'steps', target: 10000 });
        if (id === 'nutrition') setConfig({ habits: [], categories: ['nutrition'] });
        if (id === 'tracking' || id === 'checkin') setConfig({ weight: true, metrics: true, photos: true, formId: null });
    }, [id, initialConfig]);

    const handleConfigChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleToggleCategory = (catId) => {
        const current = config.categories || [];
        const updated = current.includes(catId)
            ? current.filter(c => c !== catId)
            : [...current, catId];
        handleConfigChange('categories', updated);
    };

    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
            <button
                onClick={toggle}
                className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded ? 'bg-slate-50' : ''}`}
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span>{label}</span>
                </div>
                <ChevronRight size={20} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>

            {expanded && (
                <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {id === 'neat' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Objetivo principal</label>
                                <div className="flex gap-2">
                                    {['steps', 'minutes'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => handleConfigChange('type', t)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${config.type === t ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                                        >
                                            {t === 'steps' ? 'Pasos' : 'Minutos'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cantidad objetivo</label>
                                <input
                                    type="number"
                                    value={config.target}
                                    onChange={(e) => handleConfigChange('target', parseInt(e.target.value) || 0)}
                                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                                    placeholder={config.type === 'steps' ? "Ej: 10000" : "Ej: 30"}
                                />
                            </div>
                        </div>
                    )}

                    {id === 'nutrition' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Categorías de Hábitos</label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {[
                                        { id: 'nutrition', label: 'Nutrición' },
                                        { id: 'movement', label: 'Movimiento' },
                                        { id: 'health', label: 'Salud' }
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => handleToggleCategory(cat.id)}
                                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${config.categories?.includes(cat.id) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                {config.categories?.includes(cat.id) && <Check size={12} />}
                                                {cat.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Retroactive Mode Toggle */}
                                <div className="mt-4 p-3 bg-white border border-slate-100 rounded-xl">
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                            <History size={14} className="text-orange-500" />
                                            Modo Reflexión
                                        </label>
                                        <button
                                            onClick={() => handleConfigChange('retroactive', !config.retroactive)}
                                            className={`w-10 h-6 rounded-full transition-colors relative ${config.retroactive ? 'bg-orange-500' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.retroactive ? 'left-5' : 'left-1'}`} />
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                        Si está activo, la tarea se marca hoy pero los datos se guardan para **ayer** (ideal para reportar el sueño).
                                    </p>
                                </div>

                                <p className="text-[10px] text-slate-400 italic mt-4">
                                    El atleta marcará los hábitos de los grupos seleccionados.
                                </p>
                            </div>
                        </div>
                    )}

                    {(id === 'tracking' || id === 'checkin') && (
                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Variables de seguimiento</label>
                            <div className="space-y-2">
                                {[
                                    { key: 'weight', label: 'Peso Corporal', icon: <Scale size={14} /> },
                                    { key: 'metrics', label: 'Perímetros / Medidas', icon: <Ruler size={14} /> },
                                    { key: 'photos', label: 'Fotos de Progreso', icon: <Camera size={14} /> }
                                ].map(item => (
                                    <button
                                        key={item.key}
                                        onClick={() => handleConfigChange(item.key, !config[item.key])}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${config[item.key] ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-100 text-slate-500'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {item.icon}
                                            <span className="text-xs font-bold">{item.label}</span>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${config[item.key] ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-200'}`}>
                                            {config[item.key] && <Check size={12} strokeWidth={4} />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Forms Selection */}
                            <div className="pt-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2">
                                    <FileText size={12} /> Formulario Adicional
                                </label>
                                <select
                                    value={config.formId || ''}
                                    onChange={e => handleConfigChange('formId', e.target.value)}
                                    className="w-full bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 outline-none focus:border-emerald-500 transition-colors"
                                >
                                    <option value="">Ningún formulario</option>
                                    {availableForms?.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => onAssign(config)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                    >
                        {isEdit ? 'Guardar Cambios' : 'Asignar Tarea'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserPlanning;
