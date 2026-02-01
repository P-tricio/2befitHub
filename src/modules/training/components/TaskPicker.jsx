import React, { useState } from 'react';
import { Search, ChevronRight, Layers, Utensils, MessageCircle, Footprints, CheckSquare, ClipboardList, Check, Scale, Ruler, Camera, FileText, History, Zap, Dumbbell, Plus } from 'lucide-react';

export const TaskPicker = ({
    sessions = [],
    programs = [],
    nutritionDays = [],
    availableForms = [],
    onAssign,
    user
}) => {
    const [expanded, setExpanded] = useState(null); // 'session', 'program', 'nutrition_day', 'neat', 'nutrition', 'tracking', 'scheduled_message'
    const [search, setSearch] = useState('');

    const toggle = (section) => {
        setExpanded(expanded === section ? null : section);
        setSearch(''); // Reset search when switching sections
    };

    const handleAssignGeneric = (type, config) => {
        // Normalize the payload to match what UserPlanning/ProgramBuilder expects
        // For generic tasks: { type, config }
        // For specific items (session/program/nutrition): might differ, handled below
        onAssign({ type, config });
    };

    return (
        <div className="space-y-3">
            {/* SEARCH / TITLE (Optional, maybe parent handles this?) */}

            {/* SESIONES */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white">
                <button
                    onClick={() => toggle('session')}
                    className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === 'session' ? 'bg-slate-50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <Dumbbell size={20} className="text-indigo-600" />
                        <span>Sesiones</span>
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
                                    onClick={() => onAssign({ type: 'session', sessionId: s.id, id: s.id })} // Structure expected by consumers
                                    className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 text-sm font-medium transition-colors"
                                >
                                    {s.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* PROGRAMAS (Optional for ProgramBuilder? A program inside a program is valid?) */}
            {programs.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white">
                    <button
                        onClick={() => toggle('program')}
                        className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === 'program' ? 'bg-slate-50' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            <Layers size={20} className="text-purple-600" />
                            <span>Programas</span>
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
                                        onClick={() => onAssign({ type: 'program', programId: p.id })}
                                        className="w-full text-left p-3 rounded-lg hover:bg-purple-50 hover:text-purple-700 text-sm font-medium transition-colors"
                                    >
                                        {p.name} <span className="text-slate-400 text-xs ml-2">({p.weeks} sem)</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* NUTRITION DAYS */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white">
                <button
                    onClick={() => toggle('nutrition_day')}
                    className={`w-full p-4 flex items-center justify-between font-bold text-slate-800 hover:bg-slate-50 ${expanded === 'nutrition_day' ? 'bg-slate-50' : ''}`}
                >
                    <div className="flex items-center gap-3">
                        <Utensils size={20} className="text-orange-500" />
                        <span>Nutrición (Días)</span>
                    </div>
                    <ChevronRight size={20} className={`transition-transform ${expanded === 'nutrition_day' ? 'rotate-90' : ''}`} />
                </button>
                {expanded === 'nutrition_day' && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-white p-2 rounded-xl flex items-center gap-2 border border-slate-200 mb-2">
                            <Search size={16} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar día de nutrición..."
                                className="w-full bg-transparent outline-none text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                            {nutritionDays.filter(n => n.id).filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(n => (
                                <button
                                    key={n.id}
                                    onClick={() => onAssign({ type: 'nutrition_day', dayId: n.id, name: n.name })}
                                    className="w-full text-left p-3 rounded-lg hover:bg-orange-50 hover:text-orange-700 text-sm font-medium transition-colors"
                                >
                                    {n.name} <span className="text-slate-400 text-xs ml-2">({(n.meals || []).length} comidas)</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => onAssign({ type: 'create_nutrition_day' })}
                            className="w-full mt-2 py-2 text-xs font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus size={14} /> Crear Nuevo Día de Nutrición
                        </button>
                    </div>
                )}
            </div>

            {/* GENERIC TASKS */}
            <GenericTaskSection
                id="scheduled_message"
                label="Programar Mensaje"
                icon={<MessageCircle size={20} className="text-pink-500" />}
                expanded={expanded === 'scheduled_message'}
                toggle={() => toggle('scheduled_message')}
                onAssign={(config) => handleAssignGeneric('scheduled_message', config)}
            />

            <GenericTaskSection
                id="neat"
                label="Movimiento / Pasos"
                icon={<Footprints size={20} className="text-emerald-600" />}
                expanded={expanded === 'neat'}
                toggle={() => toggle('neat')}
                onAssign={(config) => handleAssignGeneric('neat', config)}
            />

            <GenericTaskSection
                id="nutrition"
                label="Hábitos / Mínimos"
                icon={<CheckSquare size={20} className="text-orange-600" />}
                expanded={expanded === 'nutrition'}
                toggle={() => toggle('nutrition')}
                onAssign={(config) => handleAssignGeneric('nutrition', config)}
                user={user}
            />

            <GenericTaskSection
                id="tracking"
                label="Seguimiento"
                icon={<ClipboardList size={20} className="text-blue-600" />}
                expanded={expanded === 'tracking'}
                toggle={() => toggle('tracking')}
                onAssign={(config) => handleAssignGeneric('tracking', config)}
                availableForms={availableForms}
            />

            <div className="pt-2 flex justify-center">
                <button
                    onClick={() => handleAssignGeneric('free_training', {})}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full transition-colors"
                >
                    + Añadir Entrenamiento Libre
                </button>
            </div>
        </div>
    );
};

// Extracted Subcomponent
const GenericTaskSection = ({ id, label, icon, expanded, toggle, onAssign, availableForms, initialConfig, isEdit, user }) => {
    const [config, setConfig] = useState(initialConfig || {});

    const handleConfigChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleToggleCategory = (catId) => {
        setConfig(prev => {
            const current = prev.categories || [];
            if (current.includes(catId)) {
                return { ...prev, categories: current.filter(c => c !== catId) };
            } else {
                return { ...prev, categories: [...current, catId] };
            }
        });
    };

    return (
        <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-white">
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
                <div className="p-4 border-t border-slate-200 bg-slate-50 animate-in slide-in-from-top-2 duration-200 space-y-4">

                    {/* NEAT Config */}
                    {id === 'neat' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Tipo de objetivo</label>
                                <div className="flex gap-2">
                                    {['steps', 'minutes'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => handleConfigChange('type', t)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${config.type === t ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'}`}
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

                    {/* NUTRITION Config */}
                    {id === 'nutrition' && (
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Categorías de Hábitos</label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-4">
                                    {[
                                        { id: 'nutrition', label: 'Alimentación' },
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

                    {/* MESSAGE Config */}
                    {id === 'scheduled_message' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Mensaje</label>
                                <textarea
                                    value={config.message || ''}
                                    onChange={(e) => handleConfigChange('message', e.target.value)}
                                    placeholder="Escribe el mensaje que recibirá el atleta..."
                                    className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-pink-500 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Hora de envío</label>
                                <div className="flex gap-2">
                                    <input
                                        type="time"
                                        value={config.scheduledTime || '09:00'}
                                        onChange={(e) => handleConfigChange('scheduledTime', e.target.value)}
                                        className="p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-pink-500"
                                    />
                                    <div className="flex-1 p-3 bg-slate-50 text-slate-400 text-xs flex items-center justify-center rounded-xl">
                                        Hora del dispositivo del usuario
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TRACKING / CHECKIN Config */}
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
