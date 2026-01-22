import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, X, ChevronDown, ChevronUp, GripVertical, Settings2, FileText, CheckCircle2 } from 'lucide-react';
import { TrainingDB } from '../services/db';

const FormCreator = ({ onClose, isInline = false }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([
        { id: Date.now(), type: 'text', label: '', required: false, options: '' }
    ]);
    const [saving, setSaving] = useState(false);
    const [savedForms, setSavedForms] = useState([]);
    const [isEditing, setIsEditing] = useState(null); // form object

    useEffect(() => {
        loadForms();
    }, []);

    const loadForms = async () => {
        try {
            // TrainingDB.forms.getAll() - I'll add this to db.js
            const all = await TrainingDB.forms.getAll();
            setSavedForms(all);
        } catch (e) { console.error(e); }
    };

    const addField = () => {
        setFields([...fields, { id: Date.now(), type: 'text', label: '', required: false, options: '' }]);
    };

    const removeField = (id) => {
        setFields(fields.filter(f => f.id !== id));
    };

    const updateField = (id, updates) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleSave = async () => {
        if (!name) return alert('Ponle un nombre al formulario');
        setSaving(true);
        try {
            const formData = {
                name,
                description,
                fields,
                updatedAt: new Date().toISOString()
            };

            if (isEditing) {
                await TrainingDB.forms.update(isEditing.id, formData);
            } else {
                await TrainingDB.forms.create(formData);
            }

            if (onClose) onClose();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (form) => {
        setIsEditing(form);
        setName(form.name);
        setDescription(form.description);
        setFields(form.fields || []);
    };

    const deleteForm = async (id) => {
        if (!confirm('¿Eliminar formulario?')) return;
        try {
            await TrainingDB.forms.delete(id);
            loadForms();
        } catch (e) { console.error(e); }
    };

    const content = (
        <div className={`bg-white w-full ${isInline ? 'h-full' : 'max-w-4xl h-[90vh] rounded-[3rem] shadow-2xl z-10'} flex flex-col overflow-hidden`}>
            {/* Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Formularios de Seguimiento</h2>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Crea cuestionarios personalizados para tus atletas</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10"
                    >
                        <Save size={18} />
                        {saving ? 'GUARDANDO...' : 'GUARDAR FORMULARIO'}
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-400">
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar: Library of Forms */}
                <div className="w-80 border-r border-slate-100 bg-slate-50/30 overflow-y-auto p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Mis Formularios</h3>
                        <button
                            onClick={() => {
                                setIsEditing(null);
                                setName('');
                                setDescription('');
                                setFields([{ id: Date.now(), type: 'text', label: '', required: false, options: '' }]);
                            }}
                            className="p-1.5 bg-emerald-500 text-white rounded-lg"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {savedForms.length === 0 ? (
                        <div className="text-center py-8">
                            <FileText size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-[10px] text-slate-400 font-bold uppercase">No hay formularios guardados</p>
                        </div>
                    ) : (
                        savedForms.map(f => (
                            <div key={f.id} className="group relative">
                                <button
                                    onClick={() => startEdit(f)}
                                    className={`w-full p-4 rounded-2xl border text-left transition-all ${isEditing?.id === f.id ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                >
                                    <span className={`block font-black ${isEditing?.id === f.id ? 'text-emerald-600' : 'text-slate-800'}`}>{f.name}</span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{f.fields?.length || 0} Campos</span>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteForm(f.id); }}
                                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-y-auto p-12 bg-white">
                    <div className="max-w-2xl mx-auto space-y-12">
                        {/* Basics */}
                        <div className="space-y-6">
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nombre del Formulario..."
                                className="w-full text-5xl font-black text-slate-900 border-none outline-none placeholder:text-slate-100 tracking-tight"
                            />
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Descripción corta para el atleta..."
                                className="w-full p-4 bg-slate-50 rounded-3xl text-slate-600 font-medium outline-none h-24 placeholder:text-slate-300 border border-slate-100 focus:border-slate-200 transition-colors"
                            />
                        </div>

                        {/* Fields List */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Estructura de Preguntas</h3>
                                <div className="h-px flex-1 mx-4 bg-slate-100" />
                            </div>

                            {fields.map((field, idx) => (
                                <motion.div
                                    layout
                                    key={field.id}
                                    className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-6"
                                >
                                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center shrink-0 cursor-move">
                                        <GripVertical size={20} />
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div className="flex gap-4">
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={e => updateField(field.id, { label: e.target.value })}
                                                placeholder="Escribe la pregunta aquí..."
                                                className="flex-1 bg-transparent text-lg font-black text-slate-800 outline-none border-b border-dashed border-slate-200 focus:border-emerald-500 pb-1"
                                            />
                                            <select
                                                value={field.type}
                                                onChange={e => updateField(field.id, { type: e.target.value })}
                                                className="bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-xl text-xs border border-slate-100 outline-none"
                                            >
                                                <option value="text">Texto Corto</option>
                                                <option value="number">Número</option>
                                                <option value="select">Selección</option>
                                                <option value="boolean">Sí / No</option>
                                            </select>
                                        </div>

                                        {field.type === 'select' && (
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block">Opciones (separadas por comas)</label>
                                                <input
                                                    type="text"
                                                    value={field.options}
                                                    onChange={e => updateField(field.id, { options: e.target.value })}
                                                    placeholder="Mal, Regular, Bien, Excelente"
                                                    className="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold text-slate-600 outline-none border border-slate-100"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => removeField(field.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </motion.div>
                            ))}

                            <button
                                onClick={addField}
                                className="w-full py-6 border-2 border-dashed border-slate-100 rounded-3xl text-slate-300 font-black hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group"
                            >
                                <div className="w-8 h-8 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Plus size={20} />
                                </div>
                                AÑADIR PREGUNTA
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (isInline) return content;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full flex justify-center"
            >
                {content}
            </motion.div>
        </div>
    );
};

export default FormCreator;
