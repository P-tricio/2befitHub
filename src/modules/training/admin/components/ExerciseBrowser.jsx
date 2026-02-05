import React, { useState, useMemo } from 'react';
import { Search, Filter, X, Check, Dumbbell, Plus, Trash2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ExerciseCard from './ExerciseCard';
import { PATTERNS, EQUIPMENT, LEVELS, QUALITIES, FORCES, MECHANICS } from '../constants';
import { ExerciseAPI } from '../../services/exerciseApi';

/**
 * ExerciseBrowser - Unified component for browsing, filtering, and selecting exercises.
 * 
 * @param {Array} exercises - List of exercise objects
 * @param {Function} onSelect - Callback when an exercise is selected (Picker Checkbox or Click)
 * @param {Function} onEdit - Callback for editing (Management mode)
 * @param {Function} onDelete - Callback for deleting (Management mode)
 * @param {Function} onDuplicate - Callback for duplication
 * @param {Array} selectedIds - List of currently selected IDs (for multi-select)
 * @param {string} mode - 'picker' | 'manage' (affects UI and click behavior)
 * @param {boolean} isLoading - Loading state
 */
const ExerciseBrowser = ({
    exercises = [],
    onSelect,
    onEdit,
    onDelete,
    onDuplicate,
    selectedIds = [],
    groups = [], // List of group objects { name, type, id }
    onCreateGroup, // function(name)
    onDeleteGroup, // function(id)
    onMoveExercise, // function(exercise)
    mode = 'manage',
    isLoading = false
}) => {
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        pattern: [],
        equipment: [],
        level: [],
        quality: [],
        force: [],
        mechanic: []
    });

    // Online Search State
    const [onlineMode, setOnlineMode] = useState(false);
    const [onlineResults, setOnlineResults] = useState([]);
    const [isSearchingOnline, setIsSearchingOnline] = useState(false);

    // Toggle Filter Helper
    const toggleFilter = (category, value) => {
        setFilters(prev => {
            const current = prev[category];
            const updated = current.includes(value)
                ? current.filter(item => item !== value)
                : [...current, value];
            return { ...prev, [category]: updated };
        });
    };

    const clearFilters = () => {
        setFilters({
            pattern: [],
            equipment: [],
            level: [],
            quality: [],
            force: [],
            mechanic: []
        });
        setSearchTerm('');
    };

    const activeFilterCount = Object.values(filters).reduce((acc, curr) => acc + curr.length, 0);

    // Filter Logic
    const filteredExercises = useMemo(() => {
        if (onlineMode) return onlineResults;

        return exercises.filter(ex => {
            // Text Search (Name ES, Name EN, or Tags)
            const term = searchTerm.toLowerCase();
            const esName = (ex.name_es || '').toLowerCase();
            const enName = (ex.name || '').toLowerCase();
            const matchesSearch = !term || esName.includes(term) || enName.includes(term) || (ex.tags || []).some(t => t.toLowerCase().includes(term));

            if (!matchesSearch) return false;

            // Category Filters
            if (filters.pattern.length > 0 && !filters.pattern.includes(ex.pattern)) return false;

            // Equipment (check both equipmentList_es array and equipment_es/equipment string)
            if (filters.equipment.length > 0) {
                const equipmentList = ex.equipmentList_es || [];
                const equipmentString = (ex.equipment_es || ex.equipment || '');
                console.log('🔍 Filter:', filters.equipment, '| Exercise:', ex.name_es, '| Has:', equipmentList);

                const matchesEq = filters.equipment.some(selectedEq => {
                    // Check if it's in the array
                    if (equipmentList.includes(selectedEq)) return true;
                    // Check if the string contains the equipment name
                    return equipmentString.includes(selectedEq);
                });

                if (!matchesEq) return false;
            }

            if (filters.level.length > 0 && !filters.level.includes(ex.level)) return false;

            if (filters.quality.length > 0) {
                const matchesQuality = filters.quality.some(qId => {
                    // Check array qualities
                    const inArray = (ex.qualities || []).includes(qId);
                    if (inArray) return true;

                    // Check single quality string with normalization
                    const qString = (ex.quality || '').toUpperCase();
                    if (qId === 'E') return qString === 'E' || qString.startsWith('ENERG') || qString.includes('PDP-E');
                    if (qId === 'F') return qString === 'F' || qString.startsWith('FUERZ') || qString.includes('PDP-R') || qString.includes('PDP-T');
                    if (qId === 'M') return qString === 'M' || qString.startsWith('MOVIL');
                    if (qId === 'C') return qString === 'C' || qString.startsWith('CONTR');

                    return qString === qId;
                });
                if (!matchesQuality) return false;
            }

            if (filters.force.length > 0 && !filters.force.includes(ex.forceType)) return false;
            if (filters.mechanic.length > 0 && !filters.mechanic.includes(ex.movementType)) return false;

            return true;
        });
    }, [exercises, searchTerm, filters, onlineMode, onlineResults]);


    // Online Search Handler
    const handleOnlineSearch = async () => {
        if (!searchTerm) return;
        setIsSearchingOnline(true);
        try {
            const results = await ExerciseAPI.searchOnline(searchTerm);
            setOnlineResults(results);
        } catch (error) {
            console.error("Online search failed", error);
        } finally {
            setIsSearchingOnline(false);
        }
    };

    // Render Filter Section
    const renderFilters = () => (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 border-b border-slate-100"
        >
            <div className="p-4 space-y-4">
                {/* Patterns */}
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Patrón</p>
                    <div className="flex flex-wrap gap-2">
                        {PATTERNS.map(p => (
                            <button
                                key={p}
                                onClick={() => toggleFilter('pattern', p)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.pattern.includes(p) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Qualities */}
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Cualidad</p>
                    <div className="flex flex-wrap gap-2">
                        {QUALITIES.map(q => (
                            <button
                                key={q.id}
                                onClick={() => toggleFilter('quality', q.id)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.quality.includes(q.id) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {q.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* New Filters Row: Force & Mechanic & Level */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Force */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Fuerza / Tipo</p>
                        <div className="flex flex-wrap gap-2">
                            {FORCES.map(f => (
                                <button
                                    key={f}
                                    onClick={() => toggleFilter('force', f)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.force.includes(f) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Mechanic */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Mecánica</p>
                        <div className="flex flex-wrap gap-2">
                            {MECHANICS.map(m => (
                                <button
                                    key={m}
                                    onClick={() => toggleFilter('mechanic', m)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.mechanic.includes(m) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Level */}
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Nivel</p>
                        <div className="flex flex-wrap gap-2">
                            {LEVELS.map(l => (
                                <button
                                    key={l}
                                    onClick={() => toggleFilter('level', l)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.level.includes(l) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Equipment */}
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Equipamiento</p>
                    <div className="flex flex-wrap gap-2">
                        {EQUIPMENT.map(e => (
                            <button
                                key={e}
                                onClick={() => toggleFilter('equipment', e)}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${filters.equipment.includes(e) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                    }`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button onClick={clearFilters} className="text-xs text-red-500 font-bold hover:underline">
                        Limpiar Filtros
                    </button>
                </div>
            </div>
        </motion.div>
    );

    // Grouping Logic
    const [expandedGroups, setExpandedGroups] = useState({});
    const [newGroupName, setNewGroupName] = useState('');

    // Sort and Group
    const groupedExercises = useMemo(() => {
        if (onlineMode) return null; // No grouping for online results

        const grouped = filteredExercises.reduce((acc, ex) => {
            const group = ex.group || 'Sin agrupar';
            if (!acc[group]) acc[group] = [];
            acc[group].push(ex);
            return acc;
        }, {});

        // Add empty explicit groups
        groups.forEach(g => {
            if (!grouped[g.name]) grouped[g.name] = [];
        });

        // Sort groups
        return Object.keys(grouped).sort((a, b) => {
            if (a === 'Sin agrupar') return 1;
            if (b === 'Sin agrupar') return -1;
            return a.localeCompare(b);
        }).map(groupName => ({
            name: groupName,
            exercises: grouped[groupName],
            groupDoc: groups.find(g => g.name === groupName)
        }));
    }, [filteredExercises, groups, onlineMode]);

    const handleCreateGroupLocal = () => {
        if (onCreateGroup && newGroupName.trim()) {
            onCreateGroup(newGroupName);
            setNewGroupName('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Top Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-white z-10">
                {/* Mode Tabs (Local vs Online) */}
                <div className="flex justify-between items-center bg-slate-100 p-1 rounded-xl">
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                        <button
                            onClick={() => setOnlineMode(false)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!onlineMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Biblioteca Local
                        </button>
                        <button
                            onClick={() => setOnlineMode(true)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${onlineMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Buscar Online
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onlineMode && handleOnlineSearch()}
                            placeholder={onlineMode ? "Buscar en base de datos global..." : "Buscar ejercicio..."}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-emerald-500 text-sm font-medium transition-colors"
                        />
                        {isSearchingOnline && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-3 rounded-xl border transition-colors flex items-center justify-center relative ${isFilterOpen || activeFilterCount > 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Filter size={20} />
                        {activeFilterCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold border border-white">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* New Group Input (Local Only) */}
                {!onlineMode && onCreateGroup && (
                    <div className="flex items-center gap-2 justify-end pt-1">
                        <input
                            type="text"
                            placeholder="Nueva carpeta..."
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold w-32 focus:w-48 transition-all outline-none focus:border-blue-400"
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateGroupLocal()}
                        />
                        <button
                            onClick={handleCreateGroupLocal}
                            disabled={!newGroupName.trim()}
                            className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Filters Drawer */}
            <AnimatePresence>
                {isFilterOpen && renderFilters()}
            </AnimatePresence>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                {isLoading || isSearchingOnline ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 animate-pulse">
                        <Dumbbell size={32} className="mb-2 opacity-50" />
                        <p className="text-xs font-bold">Cargando ejercicios...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {onlineMode ? (
                            // Online Results (Flat List)
                            filteredExercises.length > 0 ? (
                                filteredExercises.map(ex => (
                                    <ExerciseCard
                                        key={ex.id}
                                        ex={ex}
                                        isSelected={selectedIds.includes(ex.id)}
                                        onClick={mode === 'picker' ? () => onSelect(ex) : undefined}
                                        onToggleSelect={mode === 'manage' ? () => onSelect(ex) : undefined}
                                        onImport={mode === 'manage' ? () => {/* TODO: Import? Usually just saving adds it */ } : undefined}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-sm font-medium">No se encontraron resultados online.</p>
                                </div>
                            )
                        ) : (
                            // Local Library (Grouped)
                            groupedExercises && groupedExercises.length > 0 ? (
                                groupedExercises.map(group => {
                                    if (group.name === 'Sin agrupar' && group.exercises.length === 0) return null;

                                    const isExpanded = expandedGroups[group.name] !== false; // Default expanded

                                    return (
                                        <div key={group.name} className="space-y-2 mb-2">
                                            {/* Group Header */}
                                            <div className="flex items-center gap-2 group/header-container">
                                                <button
                                                    onClick={() => setExpandedGroups(prev => ({ ...prev, [group.name]: !isExpanded }))}
                                                    className="flex-1 flex items-center justify-between p-2 hover:bg-white rounded-xl transition-colors group/header sticky top-0"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${group.name === 'Sin agrupar' ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover/header:text-slate-900 transition-colors">
                                                            {group.name} <span className="ml-1 text-slate-300">({group.exercises.length})</span>
                                                        </span>
                                                    </div>
                                                    <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                </button>
                                                {group.groupDoc && group.exercises.length === 0 && onDeleteGroup && (
                                                    <button
                                                        onClick={() => onDeleteGroup(group.groupDoc.id)}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover/header-container:opacity-100"
                                                        title="Eliminar Grupo Vacío"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>

                                            {/* Group Items */}
                                            {isExpanded && (
                                                <div className="space-y-3 pl-2 border-l-2 border-slate-100/50">
                                                    {group.exercises.length === 0 && group.name !== 'Sin agrupar' && (
                                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed text-center">
                                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Carpeta vacía</p>
                                                        </div>
                                                    )}
                                                    {group.exercises.map(ex => (
                                                        <ExerciseCard
                                                            key={ex.id}
                                                            ex={ex}
                                                            isSelected={selectedIds.includes(ex.id)}
                                                            onClick={mode === 'picker' ? () => onSelect(ex) : undefined}
                                                            onToggleSelect={mode === 'manage' ? () => onSelect(ex) : undefined}
                                                            showCheckbox={mode === 'manage'}
                                                            showActions={mode === 'manage'}
                                                            onEdit={mode === 'manage' ? () => onEdit(ex) : undefined}
                                                            onDelete={mode === 'manage' ? () => onDelete(ex.id) : undefined}
                                                            onDuplicate={mode === 'manage' ? () => onDuplicate(ex) : undefined}
                                                            onMove={onMoveExercise ? () => onMoveExercise(ex) : undefined}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <p className="text-sm font-medium">No se encontraron ejercicios locales.</p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Footer Summary (picker only) */}
            {mode === 'picker' && selectedIds.length > 0 && (
                <div className="p-4 border-t border-slate-200 bg-white sticky bottom-0 z-10 shadow-lg">
                    <p className="text-xs font-bold text-slate-600 text-center">
                        {selectedIds.length} ejercicio{selectedIds.length !== 1 ? 's' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ExerciseBrowser;