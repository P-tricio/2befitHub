import React, { useEffect, useState } from 'react';
import { Plus, Save, Calendar, Trash2, ChevronRight, ChevronDown, Search, Edit2, X, Copy, AlertCircle, ArrowRightLeft, BookmarkPlus, XCircle } from 'lucide-react';
import ActionMenu from '../../../components/admin/ActionMenu';
import { TrainingDB } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalCreator from './GlobalCreator';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

const DAYS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5', 'Día 6', 'Día 7'];

const ProgramBuilder = () => {
    const [programs, setPrograms] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Builder State
    const [currentProgram, setCurrentProgram] = useState(null);
    const [progName, setProgName] = useState('');
    const [progDescription, setProgDescription] = useState('');
    const [durationWeeks, setDurationWeeks] = useState(4);
    const [schedule, setSchedule] = useState({}); // { "w1-d1": sessionId }

    // Picker State
    const [activeSlot, setActiveSlot] = useState(null); // "w1-d1"
    const [pickerSearch, setPickerSearch] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({}); // For collapsible picker groups

    // Drag-drop State
    const [moveMode, setMoveMode] = useState(null); // Click-to-move mode for sessions
    const [moveWeekMode, setMoveWeekMode] = useState(null); // Click-to-move mode for weeks

    // Edit Session State
    const [editingSlot, setEditingSlot] = useState(null); // For showing edit options modal

    // Embedded Session Editor State
    const [sessionEditorOpen, setSessionEditorOpen] = useState(false);
    const [sessionEditorMode, setSessionEditorMode] = useState(null); // 'CLONE', 'UPDATE'
    const [sessionToEdit, setSessionToEdit] = useState(null);
    const [editorTargetSlot, setEditorTargetSlot] = useState(null);
    const [editorTargetIndex, setEditorTargetIndex] = useState(null);
    const [sessionEditorDirty, setSessionEditorDirty] = useState(false); // Track embedded editor dirty state

    // Unsaved changes tracking
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [originalProgram, setOriginalProgram] = useState(null);

    useEffect(() => {
        loadData();
        checkForDraft(); // Check for saved draft on mount
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
        const [progData, sessData, groupData] = await Promise.all([
            TrainingDB.programs.getAll(),
            TrainingDB.sessions.getAll(),
            TrainingDB.groups.getAll()
        ]);
        setPrograms(progData);
        setSessions(sessData);
        setGroups(groupData);
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

    const handleAssignSession = (sessionId) => {
        setSchedule(prev => {
            const current = prev[activeSlot] || [];
            return {
                ...prev,
                [activeSlot]: [...current, sessionId]
            };
        });
        setActiveSlot(null);
    };

    const handleSave = async () => {
        if (!progName) return alert('Nombre obligatorio');

        const programData = {
            name: progName,
            description: progDescription,
            weeks: durationWeeks,
            schedule: schedule
        };

        try {
            if (currentProgram) {
                await TrainingDB.programs.update(currentProgram.id, programData);
            } else {
                await TrainingDB.programs.create(programData);
            }
            clearDraft();
            setIsEditing(false);
            setHasUnsavedChanges(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al guardar programa');
        }
    };

    const handleAddWeek = () => {
        setDurationWeeks(prev => prev + 1);
    };

    const handleRemoveWeek = (weekNum) => {
        // Check if week has any sessions
        const hasSessionsInWeek = Object.keys(schedule).some(key => key.startsWith(`w${weekNum}-`));

        if (hasSessionsInWeek && !window.confirm(`Semana ${weekNum} tiene sesiones asignadas. ¿Eliminar de todas formas?`)) {
            return;
        }

        // Remove all sessions from this week
        const newSchedule = { ...schedule };
        Object.keys(newSchedule).forEach(key => {
            if (key.startsWith(`w${weekNum}-`)) {
                delete newSchedule[key];
            }
        });

        // Shift down weeks that come after
        const shiftedSchedule = {};
        Object.entries(newSchedule).forEach(([key, value]) => {
            const match = key.match(/w(\d+)-d(\d+)/);
            if (match) {
                const w = parseInt(match[1]);
                const d = match[2];
                if (w > weekNum) {
                    shiftedSchedule[`w${w - 1}-d${d}`] = value;
                } else {
                    shiftedSchedule[key] = value;
                }
            }
        });

        setSchedule(shiftedSchedule);
        setDurationWeeks(prev => prev - 1);
    };

    const handleClearWeek = (weekNum) => {
        if (!window.confirm(`¿Limpiar todas las sesiones de la Semana ${weekNum}?`)) {
            return;
        }

        const newSchedule = { ...schedule };
        Object.keys(newSchedule).forEach(key => {
            if (key.startsWith(`w${weekNum}-`)) {
                delete newSchedule[key];
            }
        });
        setSchedule(newSchedule);
    };

    const handleDuplicateWeek = (weekNum) => {
        // Get all sessions from this week
        const weekSessions = {};
        Object.entries(schedule).forEach(([key, value]) => {
            if (key.startsWith(`w${weekNum}-`)) {
                const dayPart = key.split('-')[1];
                weekSessions[`w${durationWeeks + 1}-${dayPart}`] = value;
            }
        });

        // Add new week with duplicated sessions
        setSchedule(prev => ({ ...prev, ...weekSessions }));
        setDurationWeeks(prev => prev + 1);
    };

    const handleMoveWeek = (weekNum) => {
        if (moveWeekMode === weekNum) {
            setMoveWeekMode(null); // Cancel
        } else if (moveWeekMode) {
            // Swap weeks
            const sourceWeek = moveWeekMode;
            const targetWeek = weekNum;

            const newSchedule = { ...schedule };
            const sourceWeekSessions = {};
            const targetWeekSessions = {};

            // Collect sessions from both weeks
            Object.entries(schedule).forEach(([key, value]) => {
                if (key.startsWith(`w${sourceWeek}-`)) {
                    const dayPart = key.split('-')[1];
                    sourceWeekSessions[dayPart] = value;
                    delete newSchedule[key];
                } else if (key.startsWith(`w${targetWeek}-`)) {
                    const dayPart = key.split('-')[1];
                    targetWeekSessions[dayPart] = value;
                    delete newSchedule[key];
                }
            });

            // Swap
            Object.entries(sourceWeekSessions).forEach(([day, sessionId]) => {
                newSchedule[`w${targetWeek}-${day}`] = sessionId;
            });
            Object.entries(targetWeekSessions).forEach(([day, sessionId]) => {
                newSchedule[`w${sourceWeek}-${day}`] = sessionId;
            });

            setSchedule(newSchedule);
            setMoveWeekMode(null);
        } else {
            setMoveWeekMode(weekNum); // Enter move mode
        }
    };

    // --- Framer Motion Drag & Drop ---
    const handleSessionDragEnd = (event, info, slotId, sessionIndex) => {
        const dropPoint = { x: info.point.x, y: info.point.y };
        const elements = document.elementsFromPoint(dropPoint.x, dropPoint.y);

        // Find drop target (slot)
        const slotElement = elements.find(el => el.hasAttribute('data-slot-id'));
        if (!slotElement) return;

        const targetSlotId = slotElement.getAttribute('data-slot-id');

        // If dropped on same slot, do nothing (or reorder if we implemented reordering)
        if (targetSlotId === slotId) return;

        // Move session
        setSchedule(prev => {
            const newSchedule = { ...prev };
            const sourceSessions = [...(newSchedule[slotId] || [])];
            const targetSessions = [...(newSchedule[targetSlotId] || [])];

            // Safety check
            if (!sourceSessions[sessionIndex]) return prev;

            const sessionToMove = sourceSessions[sessionIndex];

            // Remove from source
            sourceSessions.splice(sessionIndex, 1);

            // Add to target
            targetSessions.push(sessionToMove);

            // Cleanup empty source
            if (sourceSessions.length > 0) {
                newSchedule[slotId] = sourceSessions;
            } else {
                delete newSchedule[slotId];
            }

            // Update target
            newSchedule[targetSlotId] = targetSessions;

            return newSchedule;
        });
    };

    // Click-to-move (for individual sessions)
    const handleMoveClick = (slotId, sessionIndex) => {
        const sessions = schedule[slotId];
        if (sessionIndex !== undefined && (!sessions || !sessions[sessionIndex])) return;

        const currentMove = moveMode ? `${moveMode.slotId}-${moveMode.sessionIndex}` : null;
        const thisSession = sessionIndex !== undefined ? `${slotId}-${sessionIndex}` : slotId;

        if (currentMove === thisSession) {
            setMoveMode(null); // Cancel
        } else if (moveMode && sessionIndex !== undefined) {
            // Move individual session
            const sourceSlot = moveMode.slotId;
            const sourceIdx = moveMode.sessionIndex;

            setSchedule(prev => {
                const newSchedule = { ...prev };
                const sourceSessions = [...(newSchedule[sourceSlot] || [])];
                const targetSessions = [...(newSchedule[slotId] || [])];

                const sessionToMove = sourceSessions[sourceIdx];

                // Remove from source
                sourceSessions.splice(sourceIdx, 1);

                // Add to target at specific position
                targetSessions.splice(sessionIndex, 0, sessionToMove);

                // Update schedule
                if (sourceSessions.length > 0) {
                    newSchedule[sourceSlot] = sourceSessions;
                } else {
                    delete newSchedule[sourceSlot];
                }
                newSchedule[slotId] = targetSessions;

                return newSchedule;
            });

            setMoveMode(null);
        } else if (sessionIndex !== undefined) {
            setMoveMode({ slotId, sessionIndex }); // Enter move mode
        }
    };

    const handleDuplicateSession = (slotId) => {
        const sessionId = schedule[slotId];
        if (!sessionId) return;

        // Find next empty slot in same week
        const match = slotId.match(/w(\d+)-d(\d+)/);
        if (!match) return;

        const weekNum = match[1];
        const currentDayIdx = parseInt(match[2]);

        for (let i = currentDayIdx + 1; i < 7; i++) {
            const nextSlot = `w${weekNum}-d${i}`;
            if (!schedule[nextSlot]) {
                setSchedule(prev => ({ ...prev, [nextSlot]: sessionId }));
                return;
            }
        }

        alert('No hay slots vacíos disponibles en esta semana');
    };

    const handleDeleteSession = (slotId, sessionIndex) => {
        setSchedule(prev => {
            const sessions = prev[slotId] || [];
            const newSessions = sessions.filter((_, idx) => idx !== sessionIndex);

            if (newSessions.length === 0) {
                const newSchedule = { ...prev };
                delete newSchedule[slotId];
                return newSchedule;
            }

            return {
                ...prev,
                [slotId]: newSessions
            };
        });
    };

    const handleOpenSessionEditor = (mode, slotId, sessionIndex) => {
        const sessionsInSlot = schedule[slotId];
        if (!sessionsInSlot || !sessionsInSlot[sessionIndex]) return;

        const sessionItem = sessionsInSlot[sessionIndex];

        let session;
        if (typeof sessionItem === 'object') {
            // Already an inline object
            session = sessionItem;
        } else {
            // ID lookup
            session = sessions.find(s => s.id === sessionItem);
        }

        if (!session) return;

        setEditorTargetSlot(slotId);
        setEditorTargetIndex(sessionIndex);
        setSessionEditorMode(mode);
        setEditingSlot(null); // Close options modal

        if (mode === 'CLONE' || mode === 'INLINE') {
            // Prepare a copy
            const copy = { ...session };

            if (mode === 'CLONE') {
                delete copy.id;
                copy.name = `${copy.name} (Copia)`;
            } else {
                // INLINE mode: Ensure it has an ID if coming from ID lookup, 
                // but if we are editing an inline session, we can keep its structure.
                // We'll give it a special flag or just keeping it as object is enough.
                // We generate a specialized ID if it doesn't have one or if we are converting GLOBAL->INLINE
                if (typeof sessionItem !== 'object') {
                    copy.id = `inline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    // Append (Inline) for clarity? Maybe not needed if UI distinguishes it.
                }
            }
            setSessionToEdit(copy);
        } else {
            // Edit original (UPDATE)
            setSessionToEdit(session);
        }

        setSessionEditorOpen(true);
    };

    const handleSessionEditorSave = async (sessionData) => {
        try {
            if (sessionEditorMode === 'CLONE') {
                const newSession = await TrainingDB.sessions.create(sessionData);
                // Update local sessions list
                const allSessions = await TrainingDB.sessions.getAll();
                setSessions(allSessions);

                // Assign new session to the slot, replacing the old one
                setSchedule(prev => {
                    const newSchedule = { ...prev };
                    const slotSessions = [...(newSchedule[editorTargetSlot] || [])];
                    slotSessions[editorTargetIndex] = newSession.id;
                    newSchedule[editorTargetSlot] = slotSessions;
                    return newSchedule;
                });

                alert('Sesión creada y asignada');
            } else if (sessionEditorMode === 'UPDATE') {
                // Ensure we have an ID to update
                if (!sessionToEdit.id) throw new Error("No ID for update");

                await TrainingDB.sessions.update(sessionToEdit.id, sessionData);
                // Update local sessions list
                const allSessions = await TrainingDB.sessions.getAll();
                setSessions(allSessions);

                alert('Sesión actualizada correctamente');
            } else if (sessionEditorMode === 'INLINE') {
                // Save directly to schedule as object
                setSchedule(prev => {
                    const newSchedule = { ...prev };
                    const slotSessions = [...(newSchedule[editorTargetSlot] || [])];

                    // We save the full object
                    slotSessions[editorTargetIndex] = {
                        ...sessionData,
                        // Ensure ID exists
                        id: sessionToEdit.id || `inline_${Date.now()}`
                    };

                    newSchedule[editorTargetSlot] = slotSessions;
                    return newSchedule;
                });
            }

            setSessionEditorOpen(false);
        } catch (error) {
            console.error(error);
            alert('Error al guardar sesión: ' + error.message);
        }
    };

    const getSessionName = (idOrObj) => {
        if (typeof idOrObj === 'object') {
            return idOrObj.name || idOrObj.title || 'Sesión Personalizada';
        }
        const s = sessions.find(s => s.id === idOrObj);
        return s?.name || s?.title || 'Sin Nombre';
    };

    // Filter programs by search term
    const filteredPrograms = programs.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto relative p-6">
            {/* Header Redesigned */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Programas</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Biblioteca de programas maestros para atletas.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
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
                    <button
                        onClick={handleCreate}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-[20px] font-black flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest shrink-0"
                    >
                        <Plus size={20} />
                        Nuevo Programa
                    </button>
                </div>
            </header>

            {/* List Redesigned */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
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
                {filteredPrograms.map(p => (
                    <div
                        key={p.id}
                        onClick={() => handleEdit(p)}
                        className="group bg-white p-6 rounded-[32px] border border-slate-100 hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 transition-all cursor-pointer relative flex flex-col justify-between gap-4"
                    >
                        <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0">
                                <h3 className="font-black text-slate-900 text-lg leading-tight truncate group-hover:text-indigo-600 transition-colors">{p.name}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-2 py-0.5 bg-slate-100 text-[10px] font-black text-slate-500 rounded-md uppercase tracking-wider">{p.weeks || 4} Semanas</span>
                                    {p.description && <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{p.description}</span>}
                                </div>
                            </div>
                            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                <ActionMenu actions={[
                                    { label: 'Editar', icon: <Edit2 size={16} />, onClick: () => handleEdit(p) },
                                    { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicate(p) },
                                    { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDelete(p.id), variant: 'danger' }
                                ]} />
                            </div>
                        </div>
                    </div>
                ))}
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
                            className="fixed inset-y-0 right-0 w-full max-w-5xl bg-white shadow-2xl z-[110] flex flex-col h-full border-l border-slate-100"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white shadow-sm z-10">
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

                            {/* Main Scrollable Content */}
                            <div className="flex-1 overflow-auto bg-slate-50/30 p-8 space-y-8">
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

                                                        return (
                                                            <div
                                                                key={slotId}
                                                                data-slot-id={slotId}
                                                                className="flex flex-col h-full min-h-[140px] bg-slate-50/50 rounded-3xl p-3 border border-slate-100/50 hover:bg-white hover:shadow-lg hover:shadow-slate-200/50 transition-all"
                                                            >
                                                                <div className="text-center mb-3">
                                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
                                                                </div>

                                                                <div className="flex-1 space-y-2">
                                                                    {assignedId && assignedId.length > 0 && assignedId.map((sessionId, sessionIdx) => {
                                                                        const isThisSessionMoving = moveMode && moveMode.slotId === slotId && moveMode.sessionIndex === sessionIdx;
                                                                        return (
                                                                            <motion.div
                                                                                key={`${slotId}-${sessionIdx}`}
                                                                                drag
                                                                                dragSnapToOrigin
                                                                                dragMomentum={false}
                                                                                whileDrag={{ scale: 1.05, zIndex: 50, cursor: 'grabbing', opacity: 0.9 }}
                                                                                onDragEnd={(e, info) => handleSessionDragEnd(e, info, slotId, sessionIdx)}
                                                                                className={`flex items-center justify-between rounded-2xl p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing touch-none border group/session
                                                                                    ${isThisSessionMoving ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-200' : 'bg-white border-slate-100 shadow-sm'}
                                                                                `}
                                                                            >
                                                                                <span className="text-[11px] font-black text-slate-700 truncate select-none">
                                                                                    {isThisSessionMoving && '📍 '}
                                                                                    {getSessionName(sessionId)}
                                                                                </span>
                                                                                <div
                                                                                    className="shrink-0 scale-90 opacity-0 group-hover/session:opacity-100 transition-opacity"
                                                                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    <ActionMenu actions={[
                                                                                        { label: 'Mover', icon: <ArrowRightLeft size={14} />, onClick: () => handleMoveClick(slotId, sessionIdx) },
                                                                                        { label: 'Editar', icon: <Edit2 size={14} />, onClick: () => setEditingSlot(`${slotId}-${sessionIdx}`) },
                                                                                        { label: 'Duplicar', icon: <Copy size={14} />, onClick: () => handleDuplicateSession(slotId, sessionIdx) },
                                                                                        { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => handleDeleteSession(slotId, sessionIdx), variant: 'danger' }
                                                                                    ]} />
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}

                                                                    <button
                                                                        onClick={() => {
                                                                            if (moveMode) {
                                                                                const sourceSlot = moveMode.slotId;
                                                                                const sourceIdx = moveMode.sessionIndex;
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
                                                                                setActiveSlot(slotId);
                                                                            }
                                                                        }}
                                                                        className={`w-full py-4 px-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 border-2 border-dashed
                                                                            ${moveMode ? 'border-indigo-400 bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'border-slate-100 text-slate-300 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600'}
                                                                        `}
                                                                    >
                                                                        {moveMode ? (
                                                                            <>↓ SOLTAR</>
                                                                        ) : (
                                                                            <><Plus size={16} /> <span className="mt-1">AÑADIR</span></>
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

                            {/* Footer */}
                            <div className="p-4 bg-white border-t border-slate-100 shrink-0 z-20">
                                <button
                                    onClick={handleSave}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-900/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={18} />
                                    Guardar Programa
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Session Picker Drawer */}
            <AnimatePresence>
                {activeSlot && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[120] bg-slate-900/20 backdrop-blur-sm" onClick={() => setActiveSlot(null)} />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            className="fixed inset-y-0 right-0 z-[130] w-full max-w-md bg-white shadow-2xl flex flex-col"
                        >
                            <div className="p-6 border-b border-slate-100 shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900">Asignar Sesión</h3>
                                        <p className="text-sm text-slate-400">Para {activeSlot}</p>
                                    </div>
                                    <button
                                        onClick={() => setActiveSlot(null)}
                                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-500 hover:text-slate-900"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Buscar sesión..."
                                    className="w-full px-4 py-2 bg-slate-50 rounded-lg text-sm font-bold outline-none border focus:border-emerald-500"
                                    value={pickerSearch}
                                    onChange={e => setPickerSearch(e.target.value)}
                                />
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {(() => {
                                    const filtered = sessions.filter(s => (s.name || s.title || '').toLowerCase().includes(pickerSearch.toLowerCase()));
                                    const grouped = filtered.reduce((acc, s) => {
                                        const group = s.group || 'General';
                                        if (!acc[group]) acc[group] = [];
                                        acc[group].push(s);
                                        return acc;
                                    }, {});

                                    // Add empty explicit groups
                                    groups.forEach(g => {
                                        if (!grouped[g.name]) {
                                            grouped[g.name] = [];
                                        }
                                    });

                                    const sortedGroups = Object.keys(grouped).sort((a, b) => {
                                        if (a === 'General') return 1;
                                        if (b === 'General') return -1;
                                        return a.localeCompare(b);
                                    });

                                    return sortedGroups.map(groupName => {
                                        const groupSessions = grouped[groupName];
                                        const isExpanded = expandedGroups[groupName] !== false;

                                        return (
                                            <div key={groupName} className="space-y-1">
                                                <button
                                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [groupName]: !isExpanded }))}
                                                    className="w-full px-2 py-1.5 flex items-center justify-between hover:bg-slate-100 rounded-lg transition-colors group/header"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1 h-1 rounded-full ${groupName === 'General' ? 'bg-slate-300' : 'bg-blue-400'}`} />
                                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest transition-colors group-hover/header:text-slate-600">{groupName}</span>
                                                    </div>
                                                    <ChevronDown size={12} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>

                                                {isExpanded && (
                                                    <div className="space-y-2">
                                                        {groupSessions.map(sess => (
                                                            <button
                                                                key={sess.id}
                                                                onClick={() => handleAssignSession(sess.id)}
                                                                className="w-full text-left bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.98]"
                                                            >
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <div className="font-bold text-slate-900">{sess.name || sess.title}</div>
                                                                    <ChevronRight size={14} className="text-slate-300" />
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    {(() => {
                                                                        const b = sess.blocks;
                                                                        if (Array.isArray(b)) {
                                                                            const hasBase = b.some(bl => bl.name?.toUpperCase().includes('BASE'));
                                                                            const hasBuild = b.some(bl => bl.name?.toUpperCase().includes('BUILD'));
                                                                            const hasBurn = b.some(bl => bl.name?.toUpperCase().includes('BURN'));
                                                                            return (
                                                                                <>
                                                                                    {hasBase && <div className="w-2 h-2 rounded-full bg-blue-500" title="BASE"></div>}
                                                                                    {hasBuild && <div className="w-2 h-2 rounded-full bg-orange-500" title="BUILD"></div>}
                                                                                    {hasBurn && <div className="w-2 h-2 rounded-full bg-red-500" title="BURN"></div>}
                                                                                </>
                                                                            );
                                                                        } else if (b && typeof b === 'object') {
                                                                            return (
                                                                                <>
                                                                                    {b.BASE?.length > 0 && <div className="w-2 h-2 rounded-full bg-blue-500" title="BASE"></div>}
                                                                                    {b.BUILD?.length > 0 && <div className="w-2 h-2 rounded-full bg-orange-500" title="BUILD"></div>}
                                                                                    {b.BURN?.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500" title="BURN"></div>}
                                                                                </>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Edit Options Modal */}
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
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <AlertCircle className="text-blue-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-slate-900 mb-1">Editar Sesión</h3>
                                        <p className="text-sm text-slate-500">{getSessionName(schedule[editingSlot])}</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingSlot(null)}
                                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <p className="text-sm text-slate-600 mb-4">¿Cómo deseas editar esta sesión?</p>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => {
                                            const [slotId, idxStr] = editingSlot.split('-');
                                            // Identify session index in that slot. 
                                            // Wait, editingSlot string format is "wX-dY-INDEX" or just "wX-dY"?
                                            // Let's check handleDragStart: `${slotId}-${sessionIndex}`
                                            // So editingSlot is `w1-d1-0`. 
                                            // slotId is w1-d1, index is 0.

                                            // We need to parse it carefully.
                                            const parts = editingSlot.split('-');
                                            const sIdx = parseInt(parts.pop());
                                            const sId = parts.join('-');

                                            handleOpenSessionEditor('CLONE', sId, sIdx);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 group-hover:bg-emerald-100 rounded-lg transition-colors">
                                                <Plus size={18} className="text-slate-600 group-hover:text-emerald-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 mb-1">Guardar como nueva sesión</h4>
                                                <p className="text-xs text-slate-500">Crea una copia de la sesión y edítala sin afectar la original</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const parts = editingSlot.split('-');
                                            const sIdx = parseInt(parts.pop());
                                            const sId = parts.join('-');
                                            handleOpenSessionEditor('UPDATE', sId, sIdx);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 group-hover:bg-blue-100 rounded-lg transition-colors">
                                                <Save size={18} className="text-slate-600 group-hover:text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 mb-1">Modificar sesión en la base de datos</h4>
                                                <p className="text-xs text-slate-500">Los cambios afectarán todos los programas que usen esta sesión</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            const parts = editingSlot.split('-');
                                            const sIdx = parseInt(parts.pop());
                                            const sId = parts.join('-');
                                            handleOpenSessionEditor('INLINE', sId, sIdx);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 group-hover:bg-orange-100 rounded-lg transition-colors">
                                                <Edit2 size={18} className="text-slate-600 group-hover:text-orange-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 mb-1">Editar solo en este programa</h4>
                                                <p className="text-xs text-slate-500">Modifica la sesión únicamente para este programa</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>

                                <button
                                    onClick={() => setEditingSlot(null)}
                                    className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[160] bg-slate-900/70 backdrop-blur-sm"
                            onClick={() => setShowExitConfirm(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="fixed inset-0 z-[170] flex items-center justify-center p-4"
                        >
                            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-orange-50 rounded-lg">
                                        <AlertCircle className="text-orange-600" size={24} />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-slate-900 mb-1">¿Salir sin guardar?</h3>
                                        <p className="text-sm text-slate-500">Tienes cambios sin guardar en este programa</p>
                                    </div>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <button
                                        onClick={() => {
                                            saveDraft();
                                            setShowExitConfirm(false);
                                            setIsEditing(false);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 group-hover:bg-blue-100 rounded-lg transition-colors">
                                                <BookmarkPlus size={18} className="text-slate-600 group-hover:text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 mb-1">Sí, volveré más tarde</h4>
                                                <p className="text-xs text-slate-500">Guarda un borrador para continuar después</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => {
                                            clearDraft();
                                            setShowExitConfirm(false);
                                            setIsEditing(false);
                                            setHasUnsavedChanges(false);
                                        }}
                                        className="w-full text-left p-4 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50/50 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-slate-100 group-hover:bg-red-100 rounded-lg transition-colors">
                                                <XCircle size={18} className="text-slate-600 group-hover:text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-900 mb-1">Sí, no quiero guardar</h4>
                                                <p className="text-xs text-slate-500">Descarta todos los cambios realizados</p>
                                            </div>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setShowExitConfirm(false)}
                                        className="w-full text-left p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-500 hover:bg-emerald-100 transition-all group"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors">
                                                <Save size={18} className="text-emerald-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-emerald-900 mb-1">Ups, fue un error</h4>
                                                <p className="text-xs text-emerald-700">Continuar editando el programa</p>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
            {/* Embedded Global Creator */}
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
        </div >
    );
};
export default ProgramBuilder;
