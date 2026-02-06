import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Apple, Check, Copy, UploadCloud } from 'lucide-react';
import { NutritionDB } from '../services/nutritionDB';
import ActionMenu from '../../../components/admin/ActionMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '../../training/admin/components';

const FoodLibrary = () => {
    const [foods, setFoods] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = [
        { id: 'all', label: 'Todos', color: 'bg-slate-100 text-slate-600' },
        { id: 'protein', label: 'Proteínas', color: 'bg-red-50 text-red-600' },
        { id: 'carb', label: 'Hidratos', color: 'bg-orange-50 text-orange-600' },
        { id: 'fat', label: 'Grasas', color: 'bg-amber-50 text-amber-600' },
        { id: 'vegetable', label: 'Vegetales', color: 'bg-emerald-50 text-emerald-600' },
        { id: 'fruit', label: 'Frutas', color: 'bg-orange-50 text-orange-600' },
        { id: 'dairy', label: 'Lácteos', color: 'bg-blue-50 text-blue-600' },
        { id: 'other', label: 'Otros', color: 'bg-slate-50 text-slate-600' }
    ];

    // Editor State
    const [currentFood, setCurrentFood] = useState(null);
    const [name, setName] = useState('');
    const [calories, setCalories] = useState('');
    const [protein, setProtein] = useState('');
    const [carbs, setCarbs] = useState('');
    const [fats, setFats] = useState('');
    const [category, setCategory] = useState('protein');
    const [unit, setUnit] = useState('g'); // g, ml, unit
    const [image, setImage] = useState('');
    const [micros, setMicros] = useState({});

    useEffect(() => {
        loadFoods();
    }, []);

    // FIX PERSISTENCE: Only update form state when currentFood changes explicitly
    useEffect(() => {
        if (isEditing && currentFood) {
            setName(currentFood.name);
            setCalories(currentFood.calories);
            setProtein(currentFood.protein);
            setCarbs(currentFood.carbs);
            setFats(currentFood.fats);
            setCategory(currentFood.category || 'other');
            setUnit(currentFood.unit || 'g');
            setImage(currentFood.image || '');
            setMicros(currentFood.micros || {});
        } else if (isEditing && !currentFood) {
            setMicros({});
        }
    }, [currentFood, isEditing]); // Depend on currentFood to populate

    const loadFoods = async () => {
        const data = await NutritionDB.foods.getAll();
        setFoods(data);
    };

    const handleCreate = () => {
        setCurrentFood(null);
        setName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFats('');
        setCategory('protein');
        setUnit('g');
        setImage('');
        setIsEditing(true);
    };

    const handleEdit = (food) => {
        setCurrentFood(food); // useEffect will populate form
        setIsEditing(true);
    };

    const handleDuplicate = async (food) => {
        if (window.confirm(`¿Duplicar "${food.name}"?`)) {
            try {
                const { id, ...data } = food;
                const newFood = { ...data, name: `${data.name} (Copia)` };
                await NutritionDB.foods.create(newFood);
                loadFoods();
            } catch (e) {
                console.error(e);
                alert('Error al duplicar');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar este alimento?')) {
            await NutritionDB.foods.delete(id);
            loadFoods();
        }
    };

    const handleSave = async () => {
        if (!name) return alert('Nombre es obligatorio');

        const foodData = {
            name,
            calories: Number(calories),
            protein: Number(protein),
            carbs: Number(carbs),
            fats: Number(fats),
            category,
            unit,
            image,
            micros
        };


        try {
            if (currentFood) {
                await NutritionDB.foods.update(currentFood.id, foodData);
            } else {
                await NutritionDB.foods.create(foodData);
            }
            setIsEditing(false);
            loadFoods();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const filteredFoods = foods.filter(f => {
        const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());

        const cat = (f.category || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();
        const matchesCategory = selectedCategory === 'all' ||
            cat.includes(sel) ||
            (sel === 'protein' && (cat.includes('prote') || cat.includes('carn') || cat.includes('pesc') || cat.includes('maris'))) ||
            (sel === 'carb' && (cat.includes('carb') || cat.includes('hidra') || cat.includes('pan') || cat.includes('pasta') || cat.includes('arroz') || cat.includes('legum'))) ||
            (sel === 'fat' && cat.includes('gras')) ||
            (sel === 'vegetable' && (cat.includes('veg') || cat.includes('verd'))) ||
            (sel === 'fruit' && cat.includes('frut')) ||
            (sel === 'dairy' && (cat.includes('láct') || cat.includes('lact')));

        return matchesSearch && matchesCategory;
    });

    const getCategoryColor = (cat) => {
        const colors = {
            protein: 'bg-red-50 text-red-600',
            proteínas: 'bg-red-50 text-red-600',
            carb: 'bg-orange-50 text-orange-600',
            carbohidratos: 'bg-orange-50 text-orange-600',
            fat: 'bg-amber-50 text-amber-600',
            grasas: 'bg-amber-50 text-amber-600',
            vegetable: 'bg-emerald-50 text-emerald-600',
            vegetales: 'bg-emerald-50 text-emerald-600',
            legumbres: 'bg-emerald-50 text-emerald-600',
            fruit: 'bg-orange-50 text-orange-600',
            frutas: 'bg-orange-50 text-orange-600',
            dairy: 'bg-blue-50 text-blue-600',
            lácteos: 'bg-blue-50 text-blue-600',
            pescados: 'bg-cyan-50 text-cyan-600',
            mariscos: 'bg-cyan-50 text-cyan-600',
            carnes: 'bg-rose-50 text-rose-600',
            other: 'bg-slate-50 text-slate-600'
        };
        const lowCat = (cat || '').toLowerCase();
        return colors[lowCat] || colors.other;
    };

    return (
        <div className="h-full overflow-y-auto p-6 relative">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Biblioteca de Alimentos</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Base de datos de ingredientes y macros (por 100g).</p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar alimento..."
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-[20px] font-black flex items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Nuevo Alimento</span>
                        </button>
                    </div>
                </header>

                <div className="flex flex-wrap gap-2 mb-8">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all border-2 ${selectedCategory === cat.id
                                ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                                : 'border-transparent bg-white text-slate-400 hover:bg-slate-50'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredFoods.map(food => (
                        <div key={food.id} className="bg-white p-5 rounded-[24px] border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${getCategoryColor(food.category)}`}>
                                    {food.category}
                                </span>
                                <ActionMenu actions={[
                                    { label: 'Editar', icon: <Edit2 size={16} />, onClick: () => handleEdit(food) },
                                    { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicate(food) },
                                    { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDelete(food.id), variant: 'danger' }
                                ]} />
                            </div>

                            <h3 className="text-lg font-black text-slate-900 leading-tight mb-2 truncate" title={food.name}>
                                {food.name}
                            </h3>

                            <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-2">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                    {food.unit === 'unit' ? 'Por Unidad' : `Por 100${food.unit || 'g'}`}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-900 tracking-tighter">
                                        {Math.max(0, food.calories)} <span className="text-[10px] text-slate-400 font-bold uppercase">kcal</span>
                                    </div>
                                    <div className="flex gap-2 text-[10px] font-black mt-0.5 justify-end">
                                        <div className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">P: {Math.max(0, food.protein || 0)}</div>
                                        <div className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">C: {Math.max(0, food.carbs || 0)}</div>
                                        <div className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">G: {Math.max(0, food.fats || 0)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Edit Drawer */}
                <AnimatePresence>
                    {isEditing && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                                onClick={() => setIsEditing(false)}
                            />
                            <motion.div
                                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[110] flex flex-col h-full border-l border-slate-100"
                            >
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                                    <h2 className="text-xl font-black text-slate-900">{currentFood ? 'Editar' : 'Nuevo'} Alimento</h2>
                                    <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                                        <X size={20} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                                        <input
                                            autoFocus
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                            placeholder="Ej: Pechuga de Pollo"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                        />
                                        <div className="mt-4">
                                            <ImageUploadInput
                                                label="Imagen del Alimento"
                                                value={image}
                                                onChange={setImage}
                                                placeholder="URL de imagen..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Categoría</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                                                value={category}
                                                onChange={e => setCategory(e.target.value)}
                                            >
                                                <option value="protein">Proteína</option>
                                                <option value="carb">Hidrato</option>
                                                <option value="fat">Grasa</option>
                                                <option value="vegetable">Vegetal</option>
                                                <option value="fruit">Fruta</option>
                                                <option value="dairy">Lácteo</option>
                                                <option value="other">Otro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Unidad Base</label>
                                            <select
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                                                value={unit}
                                                onChange={e => setUnit(e.target.value)}
                                            >
                                                <option value="g">Gramos (100g)</option>
                                                <option value="ml">Mililitros (100ml)</option>
                                                <option value="unit">Unidad (1 u)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-slate-100">
                                        <p className="text-xs font-medium text-slate-400 text-center italic">
                                            Introduce valores por cada {unit === 'unit' ? '1 unidad' : `100${unit}`}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Calorías (kcal)</label>
                                                <input type="number" step="0.1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-black text-slate-900" value={calories} onChange={e => setCalories(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Proteína (g)</label>
                                                <input type="number" step="0.1" className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 font-black text-red-900" value={protein} onChange={e => setProtein(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Carbohidratos (g)</label>
                                                <input type="number" step="0.1" className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 font-black text-blue-900" value={carbs} onChange={e => setCarbs(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">Grasas (g)</label>
                                                <input type="number" step="0.1" className="w-full bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-2.5 font-black text-yellow-900" value={fats} onChange={e => setFats(e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Micronutrients Section */}
                                    <div className="space-y-4 pt-6 border-t border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Micronutrientes</label>
                                            <span className="text-[10px] font-bold text-slate-300">Opcional (mg o µg)</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                            {[
                                                { key: 'iron', label: 'Hierro (Fer)', unit: 'mg' },
                                                { key: 'calcium', label: 'Calcio', unit: 'mg' },
                                                { key: 'potassium', label: 'Potasio', unit: 'mg' },
                                                { key: 'magnesium', label: 'Magnesio', unit: 'mg' },
                                                { key: 'vitaminC', label: 'Vit C', unit: 'mg' },
                                                { key: 'vitaminD', label: 'Vit D', unit: 'µg' },
                                                { key: 'b12', label: 'Vit B12', unit: 'µg' },
                                                { key: 'zinc', label: 'Zinc', unit: 'mg' }
                                            ].map(micro => (
                                                <div key={micro.key} className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">{micro.label}</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 focus:border-indigo-300"
                                                            value={micros[micro.key] || ''}
                                                            onChange={e => setMicros({ ...micros, [micro.key]: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-slate-50">
                                    <button
                                        onClick={handleSave}
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <Save size={18} />
                                        Guardar Alimento
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FoodLibrary;
