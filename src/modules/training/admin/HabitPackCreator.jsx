import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Save, Utensils, Footprints, Heart, Package, Check } from 'lucide-react';
import { TrainingDB } from '../services/db';

const CATEGORIES = [
    { id: 'nutrition', label: 'Alimentación', icon: <Utensils size={18} />, color: 'orange' },
    { id: 'movement', label: 'Movimiento', icon: <Footprints size={18} />, color: 'emerald' },
    { id: 'health', label: 'Salud', icon: <Heart size={18} />, color: 'rose' },
];

const HabitPackCreator = ({ onClose, isInline = false }) => {
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPack, setEditingPack] = useState(null); // null or { name, habits: { nutrition: [], ... } }
    const [newHabit, setNewHabit] = useState('');
    const [activeCategory, setActiveCategory] = useState('nutrition');

    useEffect(() => {
        loadPacks();
    }, []);

    const loadPacks = async () => {
        try {
            const data = await TrainingDB.habitPacks.getAll();
            setPacks(data);
        } catch (error) {
            console.error("Error loading habit packs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setEditingPack({
            name: '',
            habits: { nutrition: [], movement: [], health: [] }
        });
    };

    const handleAddHabit = () => {
        if (!newHabit.trim()) return;
        const updated = { ...editingPack };
        if (!updated.habits[activeCategory].includes(newHabit.trim())) {
            updated.habits[activeCategory] = [...updated.habits[activeCategory], newHabit.trim()];
            setEditingPack(updated);
        }
        setNewHabit('');
    };

    const handleRemoveHabit = (category, habit) => {
        const updated = { ...editingPack };
        updated.habits[category] = updated.habits[category].filter(h => h !== habit);
        setEditingPack(updated);
    };

    const handleSavePack = async () => {
        if (!editingPack.name.trim()) return alert("El pack necesita un nombre");

        try {
            if (editingPack.id) {
                await TrainingDB.habitPacks.update(editingPack.id, editingPack);
            } else {
                await TrainingDB.habitPacks.create(editingPack);
            }
            setEditingPack(null);
            loadPacks();
        } catch (error) {
            console.error("Error saving pack:", error);
            alert("Error al guardar el pack");
        }
    };

    const handleDeletePack = async (id) => {
        if (!confirm("¿Eliminar este pack de hábitos?")) return;
        try {
            await TrainingDB.habitPacks.delete(id);
            loadPacks();
        } catch (error) {
            console.error("Error deleting pack:", error);
        }
    };

    const content = (
        <div className={`flex-1 flex overflow-hidden ${isInline ? 'min-h-[600px]' : ''}`}>
            {/* Left Sidebar: List of Packs */}
            <div className={`w-1/3 border-r border-slate-100 overflow-y-auto p-4 space-y-2 ${isInline ? 'bg-white' : 'bg-slate-50/50'}`}>
                <button
                    onClick={handleCreateNew}
                    className="w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-900 hover:bg-white text-slate-400 hover:text-slate-900 font-bold text-sm transition-all flex items-center justify-center gap-2 mb-4"
                >
                    <Plus size={18} /> Nuevo Pack
                </button>

                {packs.map(pack => (
                    <div
                        key={pack.id}
                        className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${editingPack?.id === pack.id ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                        onClick={() => setEditingPack(pack)}
                    >
                        <div className="min-w-0">
                            <p className="font-black text-slate-900 truncate">{pack.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                {Object.values(pack.habits).flat().length} hábitos
                            </p>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePack(pack.id); }}
                            className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Right Side: Editor */}
            <div className="flex-1 overflow-y-auto p-8">
                {editingPack ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Pack</label>
                            <input
                                type="text"
                                placeholder="Ej: Mínimos Iniciales"
                                value={editingPack.name}
                                onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                                className="w-full text-2xl font-black text-slate-900 border-b-2 border-slate-100 focus:border-slate-900 outline-none pb-2 transition-colors"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${activeCategory === cat.id ? `bg-white text-slate-900 shadow-sm` : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder={`Añadir a ${CATEGORIES.find(c => c.id === activeCategory).label}...`}
                                        value={newHabit}
                                        onChange={(e) => setNewHabit(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddHabit()}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-slate-900"
                                    />
                                    <button
                                        onClick={handleAddHabit}
                                        className="px-6 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-colors"
                                    >
                                        AÑADIR
                                    </button>
                                </div>

                                <div className="grid gap-2">
                                    {editingPack.habits[activeCategory].map(h => (
                                        <div key={h} className="group flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                            <span className="font-bold text-slate-700">{h}</span>
                                            <button
                                                onClick={() => handleRemoveHabit(activeCategory, h)}
                                                className="p-1 text-slate-300 hover:text-red-500"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {editingPack.habits[activeCategory].length === 0 && (
                                        <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                                            <p className="text-xs font-bold text-slate-300 uppercase">Sin hábitos en esta categoría</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSavePack}
                            className="w-full py-5 bg-emerald-500 text-slate-900 rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            <Save size={20} /> GUARDAR PACK
                        </button>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                            <Package size={32} className="text-slate-300" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black text-slate-400">Selecciona o crea un pack</h4>
                            <p className="text-xs font-bold text-slate-300 max-w-[250px]">
                                Podrás asignar estos grupos de hábitos predefinidos a tus alumnos.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (isInline) return content;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl z-[210] flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-900 text-white rounded-xl">
                            <Package size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900">Packs de Hábitos</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configuración de Mínimos por Defecto</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>
                {content}
            </motion.div>
        </div>
    );
};

export default HabitPackCreator;
