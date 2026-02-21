import React, { useEffect, useState } from 'react';
import { Plus, Save, Calendar, Trash2, ChevronRight, ChevronDown, Search, Edit2, X, Copy, AlertCircle, ArrowRightLeft, BookmarkPlus, XCircle, Utensils, Zap, MessageCircle, Footprints, CheckSquare, ClipboardList, Dumbbell, ArrowDown, Clock, Filter, Layers } from 'lucide-react';
import ActionMenu from '../../../components/admin/ActionMenu';
import { TrainingDB } from '../services/db';
import * as ProtocolService from '../services/protocolService';
import { PDP_PROTOCOLS } from '../services/pdpConstants';
import { NutritionDB } from '../../nutrition/services/nutritionDB';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalCreator from './GlobalCreator';
import DayEditor from '../../nutrition/admin/DayEditor'; // Import DayEditor
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';
import { TaskPicker } from '../components/TaskPicker';

const DAYS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'];

const ProgramBuilder = () => {
    const [programs, setPrograms] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [nutritionDays, setNutritionDays] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [availableForms, setAvailableForms] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all', 'training', 'nutrition', 'control'
    const [sortKey, setSortKey] = useState('name'); // 'name', 'createdAt'
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    // Builder State
    const [currentProgram, setCurrentProgram] = useState(null);
    const [progName, setProgName] = useState('');
    const [progDescription, setProgDescription] = useState('');
    const [durationWeeks, setDurationWeeks] = useState(4);
    const [schedule, setSchedule] = useState({}); // { "w1-d1": [taskOb1, taskObj2] }

    // Picker State
    const [activeSlot, setActiveSlot] = useState(null); // "w1-d1"

    // Drag-drop State
    const [moveMode, setMoveMode] = useState(null); // Click-to-move mode for sessions/tasks
    const [moveWeekMode, setMoveWeekMode] = useState(null); // Click-to-move mode for weeks

    // Edit Session/Task State
    const [editingSlot, setEditingSlot] = useState(null);

    // Embedded Editors State
    const [sessionEditorOpen, setSessionEditorOpen] = useState(false);
    const [sessionEditorMode, setSessionEditorMode] = useState(null);
    const [sessionToEdit, setSessionToEdit] = useState(null);
    const [sessionEditorDirty, setSessionEditorDirty] = useState(false);

    const [dayEditorOpen, setDayEditorOpen] = useState(false); // Nutrition Day Editor

    // Unsaved changes tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [originalProgram, setOriginalProgram] = useState(null);

    useEffect(() => {
        loadData();
        checkForDraft(); // Check for saved draft on mount
        loadForms();
    }, []);

    // Track changes
    useEffect(() => {
        if (!isEditing) {
            setHasUnsavedChanges(false);
            return;
        }

        // Check if current state differs from original
        const hasChanges = originalProgram && (
            progName !== originalProgram.name ||
            progDescription !== (originalProgram.description || '') ||
            durationWeeks !== (originalProgram.weeks || 1) ||
            JSON.stringify(schedule) !== JSON.stringify(originalProgram.schedule || {})
        );

        // Or if it's a new program with any content
        const isNewWithContent = !originalProgram && (progName || progDescription || Object.keys(schedule).length > 0);

        setHasUnsavedChanges(hasChanges || isNewWithContent || sessionEditorDirty);
    }, [isEditing, progName, progDescription, durationWeeks, schedule, originalProgram, sessionEditorDirty]);

    // Enable Protection
    useUnsavedChanges(hasUnsavedChanges);

    const loadData = async () => {
        const [progData, sessData, groupData, nutrData] = await Promise.all([
            TrainingDB.programs.getAll(),
            TrainingDB.sessions.getAll(),
            TrainingDB.groups.getAll(),
            NutritionDB.days.getAll()
        ]);
        setPrograms(progData);
        setSessions(sessData);
        setGroups(groupData);
        setNutritionDays(nutrData);
    };

    const loadForms = async () => {
        try {
            const forms = await TrainingDB.forms.getAll();
            setAvailableForms(forms);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreate = () => {
        setCurrentProgram(null);
        setOriginalProgram(null);
        setProgName('');
        setProgDescription('');
        setDurationWeeks(1);
        setSchedule({});
        setIsEditing(true);
    };

    const handleEdit = (prog) => {
        setCurrentProgram(prog);
        setOriginalProgram(prog);
        setProgName(prog.name);
        setProgDescription(prog.description || '');
        setDurationWeeks(prog.weeks || 1);
        setSchedule(prog.schedule || {});
        setIsEditing(true);
    };

    // Draft management
    const DRAFT_KEY = 'programBuilderDraft';

    const saveDraft = () => {
        const draft = {
            currentProgram,
            progName,
            progDescription,
            durationWeeks,
            schedule,
            timestamp: Date.now()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    };

    const loadDraft = () => {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (!saved) return null;

        try {
            return JSON.parse(saved);
        } catch {
            return null;
        }
    };

    const clearDraft = () => {
        localStorage.removeItem(DRAFT_KEY);
    };

    const checkForDraft = () => {
        const draft = loadDraft();
        if (draft && Date.now() - draft.timestamp < 7 * 24 * 60 * 60 * 1000) { // 7 days
            if (window.confirm('Tienes un borrador guardado. ¿Quieres continuar donde lo dejaste?')) {
                setCurrentProgram(draft.currentProgram);
                setOriginalProgram(draft.currentProgram);
                setProgName(draft.progName || '');
                setProgDescription(draft.progDescription || '');
                setDurationWeeks(draft.durationWeeks || 1);
                setSchedule(draft.schedule || {});
                setIsEditing(true);
                return;
            }
        }
        clearDraft();
    };

    const handleClose = () => {
        if (hasUnsavedChanges) {
            setShowExitConfirm(true);
        } else {
            setIsEditing(false);
            clearDraft();
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Seguro que quieres eliminar este programa?')) {
            try {
                await TrainingDB.programs.delete(id);
                loadData();
            } catch (e) {
                console.error(e);
                alert('Error al eliminar');
            }
        }
    };

    const handleDuplicate = async (prog) => {
        if (!window.confirm(`¿Duplicar programa "${prog.name}"?`)) return;
        try {
            const newProg = { ...prog, name: `${prog.name} (Copia)` };
            delete newProg.id;
            await TrainingDB.programs.create(newProg);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al duplicar');
        }
    };

    const handleSlotClick = (week, dayIndex) => {
        setActiveSlot(`w${week}-d${dayIndex}`);
    };

    const [isMobileLibraryOpen, setIsMobileLibraryOpen] = useState(false);

    // Generalized Assignment Handler from TaskPicker
    const handleAssignTask = (task) => {
        if (task.type === 'create_nutrition_day') {
            setDayEditorOpen(true);
            return;
        }

        // Program Import Logic
        if (task.type === 'program') {
            const prog = programs.find(p => p.id === task.programId);
            if (!prog) return;

            if (window.confirm(`¿Quieres importar el contenido de "${prog.name}"? Los elementos se combinarán con los existentes.`)) {
                setSchedule(prev => {
                    const newSchedule = { ...prev };
                    Object.entries(prog.schedule || {}).forEach(([key, val]) => {
                        // Merge: combine existing tasks with imported tasks
                        const existingTasks = newSchedule[key] || [];
                        const importedTasks = Array.isArray(val) ? val : [];
                        newSchedule[key] = [...existingTasks, ...importedTasks];
                    });
                    return newSchedule;
                });
                if (prog.weeks > durationWeeks) setDurationWeeks(prog.weeks);
                setIsMobileLibraryOpen(false); // Close mobile drawer if open
            }
            return;
        }

        if (!activeSlot) {
            alert("Selecciona primero un día en la cuadrícula (click en 'Añadir') para asignar la tarea.");
            return;
        }

        setSchedule(prev => {
            const currentTasks = prev[activeSlot] || [];
            return {
                ...prev,
                [activeSlot]: [...currentTasks, task]
            };
        });

        // Optional: Close mobile library after picking a task? Maybe keep open for multi-pick.
        // setIsMobileLibraryOpen(false); 
    };

    const handleRemoveTask = (slotId, index) => {
        setSchedule(prev => {
            const tasks = [...(prev[slotId] || [])];
            tasks.splice(index, 1);
            if (tasks.length === 0) {
                const newSchedule = { ...prev };
                delete newSchedule[slotId];
                return newSchedule;
            }
            return { ...prev, [slotId]: tasks };
        });
    };

    // ... existing save/load ...



    const handleSave = async () => {
        if (!progName.trim()) {
            alert('El programa necesita un nombre');
            return;
        }

        const programData = {
            name: progName,
            description: progDescription,
            weeks: durationWeeks,
            schedule, // Now contains mixed objects/strings
            updatedAt: Date.now()
        };

        try {
            if (currentProgram) {
                await TrainingDB.programs.update(currentProgram.id, programData);
            } else {
                await TrainingDB.programs.create(programData);
            }
            clearDraft();
            setHasUnsavedChanges(false);
            setIsEditing(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const handleAddWeek = () => {
        setDurationWeeks(prev => prev + 1);
    };

    const handleRemoveWeek = (weekNum) => {
        if (!window.confirm(`¿Eliminar la Semana ${weekNum} y todo su contenido?`)) return;

        // Shift schedules up
        setSchedule(prev => {
            const newSchedule = {};
            Object.keys(prev).forEach(key => {
                const [w, d] = key.split('-');
                const wIdx = parseInt(w.replace('w', ''));
                if (wIdx === weekNum) return; // Drop this week

                if (wIdx > weekNum) {
                    const newKey = `w${wIdx - 1}-${d}`;
                    newSchedule[newKey] = prev[key];
                } else {
                    newSchedule[key] = prev[key];
                }
            });
            return newSchedule;
        });
        setDurationWeeks(prev => prev - 1);
    };

    const handleDuplicateWeek = (weekNum) => {
        const targetWeek = durationWeeks + 1;
        setSchedule(prev => {
            const newSchedule = { ...prev };
            // Find all slots for source week
            Object.keys(prev).filter(k => k.startsWith(`w${weekNum}-`)).forEach(key => {
                const dPart = key.split('-')[1]; // d1
                const newKey = `w${targetWeek}-${dPart}`;
                newSchedule[newKey] = [...prev[key]]; // Clone array
            });
            return newSchedule;
        });
        setDurationWeeks(prev => prev + 1);
    };

    const handleClearWeek = (weekNum) => {
        if (!window.confirm(`¿Limpiar todo el contenido de la Semana ${weekNum}?`)) return;
        setSchedule(prev => {
            const newSchedule = { ...prev };
            Object.keys(prev).filter(k => k.startsWith(`w${weekNum}-`)).forEach(key => {
                delete newSchedule[key];
            });
            return newSchedule;
        });
    };

    const handleMoveWeek = (targetWeek) => {
        if (!moveWeekMode) {
            setMoveWeekMode(targetWeek);
            return;
        }

        const sourceWeek = moveWeekMode;
        if (sourceWeek === targetWeek) {
            setMoveWeekMode(null);
            return;
        }

        // Swap weeks
        setSchedule(prev => {
            const newSchedule = { ...prev };
            // Simple swap implementation for brevity
            const sourceKeys = Object.keys(prev).filter(k => k.startsWith(`w${sourceWeek}-`));
            const targetKeys = Object.keys(prev).filter(k => k.startsWith(`w${targetWeek}-`));

            const tempSchedule = { ...prev };
            [...sourceKeys, ...targetKeys].forEach(k => delete tempSchedule[k]);

            sourceKeys.forEach(k => {
                const d = k.split('-')[1];
                tempSchedule[`w${targetWeek}-${d}`] = prev[k];
            });
            targetKeys.forEach(k => {
                const d = k.split('-')[1];
                tempSchedule[`w${sourceWeek}-${d}`] = prev[k];
            });
            return tempSchedule;
        });

        setMoveWeekMode(null);
    };

    // Editor Handlers
    const handleOpenSessionEditor = (mode, sessionId, index) => {
        let sessionData = null;
        if (sessionId) {
            const idToFind = (typeof sessionId === 'object') ? sessionId.sessionId : sessionId;
            sessionData = sessions.find(s => s.id === idToFind);
        }
        setSessionToEdit(sessionData);
        setSessionEditorMode(mode);
        setSessionEditorOpen(true);
        setSessionEditorDirty(false);
    };

    const handleSessionEditorSave = async (savedSession) => {
        await loadData();
        setSessionEditorOpen(false);
        setSessionEditorDirty(false);
    };

    const handleDayEditorSave = async (dayData) => {
        // ... (lines 418-440 unchanged)
    };

    const handleMirrorSession = async (slotId, taskIndex) => {
        const task = schedule[slotId][taskIndex];
        if (task.type !== 'session') return;

        const session = sessions.find(s => s.id === (task.sessionId || task.id));
        if (!session) return;

        if (!window.confirm(`¿Generar variantes T y E para "${session.name}"? Se guardarán en tu librería.`)) return;

        try {
            const targets = ['PDP-R', 'PDP-T', 'PDP-E'].filter(p => p !== session.type);
            const results = [];

            for (const p of targets) {
                const transformed = ProtocolService.transformSessionProtocol(session, p);
                const suffix = p.split('-')[1];
                const newSession = await TrainingDB.sessions.create({
                    ...transformed,
                    name: `${session.name.replace(/\[[RTE]\]/, '')} [${suffix}]`,
                    group: session.group || 'Espejados'
                });
                results.push({ ...transformed, id: newSession.id, type: 'session', sessionId: newSession.id });
            }

            // Auto-assign to adjacent weeks if they exist?
            // The user said "cruzar protocolos", usually means Monday R, Wednesday T, Friday E.
            // For now let's just alert.
            await loadData();
            alert('Variantes creadas correctamente en la librería de sesiones.');
        } catch (e) {
            console.error(e);
            alert('Error al espejar sesión');
        }
    };

    const handleApplyHybridCycle = async (slotId, taskIndex) => {
        const task = schedule[slotId][taskIndex];
        if (task.type !== 'session') return;

        const session = sessions.find(s => s.id === (task.sessionId || task.id));
        if (!session) return;

        if (!window.confirm(`¿Generar ciclo híbrido de 6 semanas para "${session.name}"? (Semanas 1-2: R, 3-4: T, 5-6: E)`)) return;

        try {
            // 1. Ensure we have at least 6 weeks
            if (durationWeeks < 6) {
                setDurationWeeks(6);
            }

            // 2. Identify the base Monday/Day index
            const [wPart, dPart] = slotId.split('-');

            // 3. Create/Find variants
            const variants = {};
            const targets = ['PDP-R', 'PDP-T', 'PDP-E'];

            for (const p of targets) {
                if (session.type === p) {
                    variants[p] = session;
                    continue;
                }

                const suffix = p.split('-')[1]; // R, T, or E

                // --- Robust Name Matching Logic (Nomenclature: PDP-PROT-SEX-VAR) ---
                // 1. Extract the "core" part (everything after the first two parts of PDP-X-)
                // Or simply strip the PDP-X- prefix and handle the dash.
                const coreName = session.name
                    .replace(/^PDP-[RTE]-/i, '') // Remove PDP-R-, PDP-T-, etc.
                    .replace(/\s*\[[RTE]\]$/i, '')
                    .trim();

                // 2. Generate target names based on user's exact convention
                const possibleNames = [
                    `PDP-${suffix}-${coreName}`,         // Exact: PDP-T-M(A1)
                    `PDP-${suffix}-${coreName.replace(/^-/, '')}`, // Handle double dashes if they occur
                    `${coreName} [${suffix}]`,           // Alternative: M(A1) [T]
                ];

                // 3. Match existing sessions (case-insensitive and type-safe)
                const existing = sessions.find(s =>
                    s.type === p &&
                    possibleNames.some(pn => String(s.name || '').toLowerCase().trim() === String(pn || '').toLowerCase().trim())
                );

                if (existing) {
                    variants[p] = existing;
                } else {
                    const transformed = ProtocolService.transformSessionProtocol(session, p);

                    // Use the user's preferred convention for the new name
                    // If the original had a prefix PDP-X-, use a prefix. Otherwise use a suffix.
                    const usePrefix = /^PDP-[RTE]-/i.test(session.name);
                    const newName = usePrefix ? `PDP-${suffix}-${coreName}` : `${coreName} [${suffix}]`;

                    const createdSession = await TrainingDB.sessions.create({
                        ...transformed,
                        name: newName,
                        group: session.group || 'Programación'
                    });
                    const fullCreated = { ...transformed, id: createdSession.id, type: p };
                    variants[p] = fullCreated;
                    // Add to local state so next lookups find it
                    setSessions(prev => [...prev, fullCreated]);
                }
            }

            // 4. Distribute across schedule
            setSchedule(prev => {
                const newSchedule = { ...prev };
                const map = [
                    { week: 1, type: 'PDP-R' },
                    { week: 2, type: 'PDP-R' },
                    { week: 3, type: 'PDP-T' },
                    { week: 4, type: 'PDP-T' },
                    { week: 5, type: 'PDP-E' },
                    { week: 6, type: 'PDP-E' }
                ];

                map.forEach(item => {
                    const targetSlot = `w${item.week}-${dPart}`;
                    const targetSession = variants[item.type];

                    const currentTasks = newSchedule[targetSlot] || [];
                    // Check if already assigned to avoid duplicates
                    if (!currentTasks.find(t => (t.sessionId || t.id) === targetSession.id)) {
                        newSchedule[targetSlot] = [...currentTasks, {
                            id: crypto.randomUUID(),
                            type: 'session',
                            sessionId: targetSession.id
                        }];
                    }
                });

                return newSchedule;
            });

            alert('Ciclo híbrido aplicado correctamente.');
        } catch (e) {
            console.error(e);
            alert('Error al aplicar ciclo híbrido');
        }
    };

    // Helper to get task visual info
    const getTaskInfo = (taskOrId) => {
        if (!taskOrId) return { name: 'Desconocido', icon: <AlertCircle size={14} />, color: 'bg-slate-100 text-slate-500' };

        // Legacy string ID
        if (typeof taskOrId === 'string') {
            const s = sessions.find(sess => sess.id === taskOrId);
            return {
                name: s?.name || 'Sesión (ID)',
                icon: <Dumbbell size={14} />,
                color: 'bg-slate-100 text-slate-500' // Generic session color
            };
        }

        // Object
        switch (taskOrId.type) {
            case 'session':
                const s = sessions.find(sess => sess.id === taskOrId.sessionId || sess.id === taskOrId.id); // Handle both formats just in case
                return {
                    name: s?.name || 'Sesión',
                    icon: <Dumbbell size={14} />,
                    color: 'bg-indigo-50 text-indigo-600'
                };
            case 'nutrition_day':
                return {
                    name: taskOrId.name || 'Día de Nutrición',
                    icon: <Utensils size={14} />,
                    color: 'bg-orange-50 text-orange-600'
                };
            case 'scheduled_message':
                return {
                    name: 'Mensaje Programado', // Could truncate message
                    icon: <MessageCircle size={14} />,
                    color: 'bg-pink-50 text-pink-600'
                };
            case 'neat':
                return {
                    name: `NEAT: ${taskOrId.config?.target || 0} ${taskOrId.config?.type === 'minutes' ? 'min' : 'pasos'}`,
                    icon: <Footprints size={14} />,
                    color: 'bg-emerald-50 text-emerald-600'
                };
            case 'nutrition': // Checkbox habits
                return {
                    name: 'Hábitos / Mínimos',
                    icon: <CheckSquare size={14} />,
                    color: 'bg-orange-50 text-orange-600'
                };
            case 'tracking':
            case 'checkin':
                return {
                    name: 'Check-in / Seguimiento',
                    icon: <ClipboardList size={14} />,
                    color: 'bg-blue-50 text-blue-600'
                };
            case 'free_training':
                return {
                    name: 'Entrenamiento Libre',
                    icon: <Dumbbell size={14} />,
                    color: 'bg-violet-50 text-violet-600'
                };
            default:
                return {
                    name: 'Tarea Desconocida',
                    icon: <AlertCircle size={14} />,
                    color: 'bg-slate-100 text-slate-400'
                };
        }
    };

    const getProgramStats = (p) => {
        const schedule = p.schedule || {};
        const stats = { training: 0, nutrition: 0, control: 0 };

        Object.values(schedule).forEach(dayTasks => {
            if (Array.isArray(dayTasks)) {
                dayTasks.forEach(t => {
                    const type = t.type || (typeof t === 'string' ? 'session' : 'unknown');
                    if (type === 'session' || type === 'free_training') stats.training++;
                    else if (type === 'nutrition_day' || type === 'nutrition') stats.nutrition++;
                    else if (type === 'tracking' || type === 'checkin' || type === 'neat' || type === 'scheduled_message') stats.control++;
                });
            }
        });
        return stats;
    };

    // Filter and sort programs for list view
    const filteredPrograms = programs
        .filter(p => {
            const matchesSearch = String(p.name || '').toLowerCase().includes(String(searchTerm || '').toLowerCase());
            if (!matchesSearch) return false;

            if (filterType === 'all') return true;

            const stats = getProgramStats(p);
            if (filterType === 'training') return stats.training > 0;
            if (filterType === 'nutrition') return stats.nutrition > 0;
            if (filterType === 'control') return stats.control > 0;

            return true;
        })
        .sort((a, b) => {
            if (sortKey === 'createdAt') {
                const dateA = a.createdAt?.toDate?.()?.getTime() || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
                const dateB = b.createdAt?.toDate?.()?.getTime() || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
                return dateB - dateA; // Newest first
            }
            return (a.name || '').localeCompare(b.name || '');
        });

    return (
        <div className="max-w-[1600px] mx-auto relative p-6">
            {/* Header Redesigned */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Programas</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Biblioteca de programas maestros para atletas.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-center">
                    <div className="relative flex-1 sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar programas..."
                            className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                        />
                    </div>

                    {/* Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsFilterOpen(!isFilterOpen);
                                setIsSortOpen(false);
                            }}
                            className={`flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 ${filterType !== 'all' ? 'border-slate-900 bg-slate-50' : ''}`}
                        >
                            <Filter size={18} className={filterType !== 'all' ? 'text-slate-900' : 'text-slate-400'} />
                            <span className="hidden sm:inline">
                                {filterType === 'all' ? 'Filtros' : (filterType === 'training' ? 'Entreno' : (filterType === 'nutrition' ? 'Nutrición' : 'Control'))}
                            </span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isFilterOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-2 w-56 bg-slate-900 text-white rounded-[24px] shadow-2xl py-3 z-50 border border-white/10 overflow-hidden"
                                >
                                    <button onClick={() => { setFilterType('all'); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${filterType === 'all' ? 'text-indigo-400 bg-white/5' : ''}`}>Todos</button>
                                    <button onClick={() => { setFilterType('training'); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${filterType === 'training' ? 'text-indigo-400 bg-white/5' : ''}`}>Entrenamientos</button>
                                    <button onClick={() => { setFilterType('nutrition'); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${filterType === 'nutrition' ? 'text-indigo-400 bg-white/5' : ''}`}>Nutrición</button>
                                    <button onClick={() => { setFilterType('control'); setIsFilterOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${filterType === 'control' ? 'text-indigo-400 bg-white/5' : ''}`}>Control / Otros</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setIsSortOpen(!isSortOpen);
                                setIsFilterOpen(false);
                            }}
                            className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50"
                        >
                            <ArrowRightLeft size={18} className="text-slate-400 rotate-90" />
                            <span className="hidden sm:inline">
                                {sortKey === 'name' ? 'Nombre' : 'Creación'}
                            </span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                            {isSortOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 mt-2 w-56 bg-slate-900 text-white rounded-[24px] shadow-2xl py-3 z-50 border border-white/10 overflow-hidden"
                                >
                                    <button onClick={() => { setSortKey('name'); setIsSortOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${sortKey === 'name' ? 'text-indigo-400 bg-white/5' : ''}`}>Alfabético (A-Z)</button>
                                    <button onClick={() => { setSortKey('createdAt'); setIsSortOpen(false); }} className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors ${sortKey === 'createdAt' ? 'text-indigo-400 bg-white/5' : ''}`}>Más Recientes</button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={handleCreate}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-[20px] font-black flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-xs uppercase tracking-widest shrink-0"
                    >
                        <Plus size={20} />
                        Nuevo Programa
                    </button>
                </div>
            </header>

            {/* List Redesigned */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6 pb-20">
                {filteredPrograms.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
                            <Plus size={32} />
                        </div>
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest italic">
                            {programs.length === 0 ? 'No hay programas creados aún.' : 'No se encontraron programas.'}
                        </p>
                    </div>
                )}
                {filteredPrograms.map(p => {
                    const stats = getProgramStats(p);
                    const updateDate = p.updatedAt ? (typeof p.updatedAt === 'number' ? new Date(p.updatedAt) : p.updatedAt.toDate?.()) : null;

                    return (
                        <div
                            key={p.id}
                            onClick={() => handleEdit(p)}
                            className="group bg-white p-6 rounded-[32px] border border-slate-100 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-pointer relative flex flex-col justify-between gap-6"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-md">Master</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest rounded-md">{p.weeks || 4} Semanas</span>
                                    </div>
                                    <h3 className="font-black text-slate-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{p.name}</h3>
                                    {p.description && (
                                        <p className="text-slate-400 text-xs font-medium mt-1 line-clamp-1">{p.description}</p>
                                    )}
                                </div>
                                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <ActionMenu actions={[
                                        { label: 'Editar', icon: <Edit2 size={16} />, onClick: () => handleEdit(p) },
                                        { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicate(p) },
                                        { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDelete(p.id), variant: 'danger' }
                                    ]} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100/50 flex flex-col items-center justify-center gap-0.5 group-hover:bg-white group-hover:border-indigo-100 transition-all">
                                        <Dumbbell size={12} className="text-indigo-500" />
                                        <span className="text-[9px] font-black text-slate-700">{stats.training}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Entrenos</span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100/50 flex flex-col items-center justify-center gap-0.5 group-hover:bg-white group-hover:border-orange-100 transition-all">
                                        <Utensils size={12} className="text-orange-500" />
                                        <span className="text-[9px] font-black text-slate-700">{stats.nutrition}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Nutrición</span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-xl p-2 border border-slate-100/50 flex flex-col items-center justify-center gap-0.5 group-hover:bg-white group-hover:border-emerald-100 transition-all">
                                        <ClipboardList size={12} className="text-emerald-500" />
                                        <span className="text-[9px] font-black text-slate-700">{stats.control}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Control</span>
                                    </div>
                                </div>

                                {/* Item Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Clock size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            {updateDate ? updateDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : '—'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(p)}
                                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                    >
                                        VER DETALLES
                                        <ChevronRight size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Editor Drawer (Right Side) */}
            <AnimatePresence>
                {isEditing && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                            onClick={handleClose}
                        />

                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-full max-w-[95vw] bg-white shadow-2xl z-[110] flex flex-col h-full border-l border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white shadow-sm z-10">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {currentProgram ? 'Editar Programa' : 'Nuevo Programa'}
                                    </h2>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Panel de Configuración Técnica</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleSave}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-indigo-900/20 text-sm transition-all"
                                    >
                                        <Save size={18} />
                                        GUARDAR
                                    </button>
                                    <button onClick={handleClose} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Editor Layout: Sidebar + Main */}
                            <div className="flex-1 flex overflow-hidden relative">

                                {/* --- SIDEBAR (PICKER) --- */}
                                <div className={`
                                    bg-white border-r border-slate-200 flex flex-col z-30 shadow-2xl overflow-hidden shrink-0 transition-transform duration-300
                                    fixed inset-y-0 left-0 w-[85%] sm:w-80 lg:relative lg:translate-x-0 lg:shadow-sm lg:z-auto
                                    ${isMobileLibraryOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                                `}>
                                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                                                <BookmarkPlus size={14} className="text-indigo-500" />
                                                Librería
                                            </h3>
                                            <p className="text-[10px] text-slate-400">Selecciona un día en el calendario y añade elementos.</p>
                                        </div>
                                        {/* Mobile Close Button */}
                                        <button
                                            onClick={() => setIsMobileLibraryOpen(false)}
                                            className="lg:hidden p-2 text-slate-400 hover:text-slate-900"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                                        <TaskPicker
                                            sessions={sessions}
                                            programs={programs}
                                            nutritionDays={nutritionDays}
                                            availableForms={availableForms}
                                            onAssign={handleAssignTask}
                                        />
                                    </div>
                                </div>

                                {/* --- MAIN CONTENT (WEEKS) --- */}
                                <div className="flex-1 overflow-auto bg-slate-50/30 p-2 md:p-8 space-y-8 relative">
                                    {/* Mobile FAB for Library */}
                                    <button
                                        onClick={() => setIsMobileLibraryOpen(true)}
                                        className="lg:hidden fixed bottom-6 right-6 z-40 bg-indigo-600 text-white p-4 rounded-full shadow-xl shadow-indigo-600/30 active:scale-95 transition-transform flex items-center gap-2 font-bold"
                                    >
                                        <BookmarkPlus size={20} />
                                        <span className="text-xs">Librería</span>
                                    </button>
                                    {/* Program Info */}
                                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nombre Maestro</label>
                                                <input
                                                    type="text"
                                                    value={progName}
                                                    onChange={e => setProgName(e.target.value)}
                                                    placeholder="Ej: Bloque de Hipertrofia Pro"
                                                    className="w-full text-xl font-black text-slate-900 placeholder:text-slate-200 outline-none border-b-2 border-slate-100 focus:border-indigo-600 pb-2 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Descripción del Objetivo</label>
                                                <textarea
                                                    value={progDescription}
                                                    onChange={e => setProgDescription(e.target.value)}
                                                    placeholder="Breve resumen del enfoque del programa..."
                                                    className="w-full text-sm font-medium text-slate-600 placeholder:text-slate-200 outline-none border-b-2 border-slate-100 focus:border-indigo-600 pb-2 transition-all resize-none"
                                                    rows={1}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Weeks Container */}
                                    <div className="space-y-8 pb-12">
                                        {Array.from({ length: durationWeeks }).map((_, wIdx) => {
                                            const weekNum = wIdx + 1;
                                            return (
                                                <div key={weekNum} className={`bg-white rounded-[2.5rem] shadow-sm border-2 overflow-hidden transition-all
                                                    ${moveWeekMode === weekNum ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-slate-100/50'}
                                                `}>
                                                    {/* Week Header */}
                                                    <div className={`px-6 py-4 border-b border-slate-100 flex justify-between items-center
                                                        ${moveWeekMode === weekNum ? 'bg-indigo-50/50' : moveWeekMode ? 'bg-indigo-50/20 hover:bg-indigo-50 cursor-pointer' : 'bg-slate-50/30'}
                                                    `}
                                                        onClick={() => moveWeekMode && moveWeekMode !== weekNum && handleMoveWeek(weekNum)}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                                                                W{weekNum}
                                                            </div>
                                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                                                {moveWeekMode === weekNum && '📍 '}
                                                                Semana {weekNum}
                                                                {moveWeekMode && moveWeekMode !== weekNum && <span className="text-indigo-600 ml-2">← MOVER AQUÍ</span>}
                                                            </h3>
                                                        </div>
                                                        <ActionMenu actions={
                                                            durationWeeks === 1 ? [
                                                                { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicateWeek(weekNum) },
                                                                { label: 'Limpiar', icon: <Trash2 size={16} />, onClick: () => handleClearWeek(weekNum), variant: 'danger' }
                                                            ] : [
                                                                { label: 'Mover', icon: <ArrowRightLeft size={16} />, onClick: () => handleMoveWeek(weekNum) },
                                                                { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicateWeek(weekNum) },
                                                                { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleRemoveWeek(weekNum), variant: 'danger' }
                                                            ]
                                                        } />
                                                    </div>

                                                    {/* Days Grid */}
                                                    <div className="p-4 grid grid-cols-1 md:grid-cols-7 gap-3">
                                                        {DAYS.map((day, dIdx) => {
                                                            const slotId = `w${weekNum}-d${dIdx}`;
                                                            const assignedId = schedule[slotId];
                                                            const isActive = activeSlot === slotId;

                                                            return (
                                                                <div
                                                                    key={slotId}
                                                                    data-slot-id={slotId}
                                                                    className={`flex flex-col h-full min-h-[140px] rounded-3xl p-3 border transition-all
                                                                        ${isActive
                                                                            ? 'bg-indigo-50/50 border-indigo-200 ring-4 ring-indigo-50/50 shadow-inner'
                                                                            : 'bg-slate-50/50 border-slate-100/50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50'
                                                                        }
                                                                    `}
                                                                >
                                                                    <div className="text-right mb-3 px-1">
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{day}</span>
                                                                    </div>

                                                                    <div className="flex-1 space-y-2">
                                                                        {/* Session List */}
                                                                        <div className="space-y-2 mb-2">
                                                                            {assignedId && assignedId.map((taskOrId, tIdx) => {
                                                                                const isThisSessionMoving = moveMode && moveMode.slotId === slotId && moveMode.sessionIndex === tIdx;
                                                                                const info = getTaskInfo(taskOrId);

                                                                                return (
                                                                                    <motion.div
                                                                                        key={`${slotId}-${tIdx}`}
                                                                                        layout
                                                                                        drag
                                                                                        dragSnapToOrigin
                                                                                        dragMomentum={false}
                                                                                        whileHover={{ scale: 1.02 }}
                                                                                        whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
                                                                                        onDragStart={() => setMoveMode({ slotId, sessionIndex: tIdx })}
                                                                                        onDragEnd={(e) => {
                                                                                            setMoveMode(null);
                                                                                            // Drop logic is handled by target button, here we just reset
                                                                                        }}
                                                                                        className={`relative flex items-center justify-between rounded-xl p-2.5 transition-all cursor-grab active:cursor-grabbing touch-none border group/session
                                                                                            ${isThisSessionMoving
                                                                                                ? 'bg-indigo-50 border-indigo-300 opacity-50 ring-2 ring-indigo-100'
                                                                                                : `border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md ${info.color.replace('text-', 'border-').replace('bg-', 'bg-white ')} bg-white`
                                                                                            }
                                                                                        `}
                                                                                    >
                                                                                        <div className="flex items-center gap-2 min-w-0">
                                                                                            <div className={`p-1.5 rounded-lg ${info.color}`}>
                                                                                                {info.icon}
                                                                                            </div>
                                                                                            <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">
                                                                                                {info.name}
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* Quick Actions (Hover) */}
                                                                                        <div className="absolute right-2 flex gap-1 opacity-0 group-hover/session:opacity-100 transition-opacity bg-white/90 p-1 rounded-lg shadow-sm border border-slate-100 max-w-full overflow-hidden z-10">
                                                                                            {(typeof taskOrId === 'string' || taskOrId.type === 'session') && (
                                                                                                <>
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleMirrorSession(slotId, tIdx);
                                                                                                        }}
                                                                                                        className="p-1 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                                        title="Espejar Protocolos (Mirror PDP)"
                                                                                                    >
                                                                                                        <Zap size={12} />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            handleApplyHybridCycle(slotId, tIdx);
                                                                                                        }}
                                                                                                        className="p-1 hover:bg-emerald-50 rounded text-slate-400 hover:text-emerald-600 transition-colors"
                                                                                                        title="Aplicar Ciclo Híbrido (6 sem)"
                                                                                                    >
                                                                                                        <Layers size={12} />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setEditingSlot(`${slotId}-${tIdx}`);
                                                                                                        }}
                                                                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                                                                                                        title="Editar"
                                                                                                    >
                                                                                                        <Edit2 size={12} />
                                                                                                    </button>
                                                                                                </>
                                                                                            )}
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleRemoveTask(slotId, tIdx);
                                                                                                }}
                                                                                                className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors"
                                                                                                title="Eliminar"
                                                                                            >
                                                                                                <X size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                    </motion.div>
                                                                                );
                                                                            })}
                                                                        </div>

                                                                        {/* Add/Drop Button */}
                                                                        <button
                                                                            onClick={() => {
                                                                                if (moveMode) {
                                                                                    // Handle Drop Logic
                                                                                    const sourceSlot = moveMode.slotId;
                                                                                    const sourceIdx = moveMode.sessionIndex;
                                                                                    if (sourceSlot === slotId) {
                                                                                        setMoveMode(null);
                                                                                        return;
                                                                                    }

                                                                                    setSchedule(prev => {
                                                                                        const newSchedule = { ...prev };
                                                                                        const sourceSessions = [...(newSchedule[sourceSlot] || [])];
                                                                                        const targetSessions = [...(newSchedule[slotId] || [])];

                                                                                        const sessionToMove = sourceSessions[sourceIdx];
                                                                                        sourceSessions.splice(sourceIdx, 1);
                                                                                        targetSessions.push(sessionToMove);

                                                                                        if (sourceSessions.length > 0) newSchedule[sourceSlot] = sourceSessions;
                                                                                        else delete newSchedule[sourceSlot];

                                                                                        newSchedule[slotId] = targetSessions;
                                                                                        return newSchedule;
                                                                                    });
                                                                                    setMoveMode(null);
                                                                                } else {
                                                                                    setActiveSlot(isActive ? null : slotId);
                                                                                }
                                                                            }}
                                                                            className={`w-full py-3 px-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-dashed
                                                                                ${isActive
                                                                                    ? 'border-indigo-400 bg-indigo-500 text-white shadow-lg scale-105'
                                                                                    : moveMode
                                                                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 scale-105 shadow-lg shadow-indigo-500/10'
                                                                                        : 'border-slate-200 text-slate-400 hover:border-emerald-400 hover:bg-emerald-50/10 hover:text-emerald-600'
                                                                                }
                                                                            `}
                                                                        >
                                                                            {moveMode ? (
                                                                                <>
                                                                                    <ArrowDown size={14} className="animate-bounce" />
                                                                                    Soltar Aquí
                                                                                </>
                                                                            ) : isActive ? (
                                                                                <>
                                                                                    <Zap size={14} fill="white" />
                                                                                    Seleccionado
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Plus size={14} />
                                                                                    Añadir
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Add Week Button */}
                                        <button
                                            onClick={handleAddWeek}
                                            className="w-full border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all text-slate-300 hover:text-indigo-600 font-black flex items-center justify-center gap-3 uppercase tracking-[0.3em]"
                                        >
                                            <Plus size={24} />
                                            NUEVA SEMANA
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Edit Options Modal (Keep existing/simplified) */}
            <AnimatePresence>
                {editingSlot && schedule[editingSlot] && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[140] bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setEditingSlot(null)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed inset-0 z-[150] flex items-center justify-center p-4"
                        >
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                                {/* Simplification: Only support edit for Session types for now, others just delete */}
                                <div className="flex items-start gap-3 mb-4">
                                    {/* This modal logic was based on split string indices, ensure it still works */}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-slate-900 mb-1">Editar Tarea</h3>
                                    </div>
                                    <button onClick={() => setEditingSlot(null)}><X size={20} /></button>
                                </div>
                                <p className="text-sm text-slate-500 mb-4">
                                    Edición avanzada de sesiones disponible. Para otras tareas, elimínala y vuelve a crearla.
                                </p>
                                {/* We can restore the full edit modal later if needed, mostly for sessions it's critical */}
                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            const parts = editingSlot.split('-');
                                            const sIdx = parseInt(parts.pop());
                                            const slotId = parts.join('-');
                                            const task = schedule[slotId][sIdx];

                                            // Ensure it is a session
                                            const isSession = typeof task === 'string' || task.type === 'session';
                                            if (isSession) {
                                                const sId = (typeof task === 'string') ? task : task.sessionId;
                                                handleOpenSessionEditor('CLONE', sId, sIdx);
                                            }
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all font-bold text-slate-700"
                                    >
                                        Editar Sesión
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal (Keep existing) */}
            <AnimatePresence>
                {showExitConfirm && (
                    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-3">
                            <h3 className="font-black text-lg">¿Salir sin guardar?</h3>
                            <button onClick={() => { saveDraft(); setShowExitConfirm(false); setIsEditing(false); }} className="w-full p-3 bg-blue-50 text-blue-600 rounded-xl font-bold">Guardar Borrador</button>
                            <button onClick={() => { clearDraft(); setShowExitConfirm(false); setIsEditing(false); setHasUnsavedChanges(false); }} className="w-full p-3 bg-red-50 text-red-600 rounded-xl font-bold">Descartar Cambios</button>
                            <button onClick={() => setShowExitConfirm(false)} className="w-full p-3 bg-slate-100 rounded-xl font-bold">Cancelar</button>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            {/* Embedded Global Creator (Keep existing) */}
            <AnimatePresence>
                {sessionEditorOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] bg-white flex flex-col"
                    >
                        <div className="flex-1 overflow-hidden relative">
                            <GlobalCreator
                                embeddedMode={true}
                                initialSession={sessionToEdit}
                                onClose={() => {
                                    if (sessionEditorDirty) {
                                        if (window.confirm('Hay cambios sin guardar en la sesión. ¿Cerrar de todos modos?')) {
                                            setSessionEditorOpen(false);
                                            setSessionEditorDirty(false);
                                        }
                                    } else {
                                        setSessionEditorOpen(false);
                                    }
                                }}
                                onSave={handleSessionEditorSave}
                                onDirtyChange={setSessionEditorDirty}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Day Editor Component */}
            <AnimatePresence>
                {dayEditorOpen && (
                    <DayEditor
                        isOpen={dayEditorOpen}
                        onClose={() => setDayEditorOpen(false)}
                        initialDayId={null} // Always create new when accessed from here for now
                        onSave={handleDayEditorSave}
                        availableDays={nutritionDays}
                    />
                )}
            </AnimatePresence>
        </div >
    );
};
export default ProgramBuilder;
