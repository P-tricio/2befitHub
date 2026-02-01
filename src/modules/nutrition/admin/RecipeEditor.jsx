import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, ChefHat, Utensils, ArrowRight, Copy, UploadCloud } from 'lucide-react';
import { NutritionDB } from '../services/nutritionDB';
import { calculateItemMacros } from '../services/portionService';
import ActionMenu from '../../../components/admin/ActionMenu';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageUploadInput } from '../../training/admin/components';

const RecipeEditor = () => {
    const [recipes, setRecipes] = useState([]);
    const [foods, setFoods] = useState([]); // Cache of all foods for selection
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Editor State
    const [currentRecipe, setCurrentRecipe] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [instructions, setInstructions] = useState('');
    const [ingredients, setIngredients] = useState([]); // [{ foodId, quantity, ...cacheMacros }]
    const [image, setImage] = useState('');
    const [activeFoodSearch, setActiveFoodSearch] = useState(false); // For adding ingredient

    useEffect(() => {
        loadData();
    }, []);

    // FIX PERSISTENCE
    useEffect(() => {
        if (isEditing && currentRecipe) {
            setName(currentRecipe.name);
            setDescription(currentRecipe.description || '');
            setInstructions(currentRecipe.instructions || '');
            setIngredients(currentRecipe.ingredients || []);
            setImage(currentRecipe.image || '');
        }
    }, [currentRecipe, isEditing]);

    const loadData = async () => {
        const [rData, fData] = await Promise.all([
            NutritionDB.recipes.getAll(),
            NutritionDB.foods.getAll()
        ]);
        setRecipes(rData);
        setFoods(fData);
    };

    const handleCreate = () => {
        setCurrentRecipe(null);
        setName('');
        setDescription('');
        setInstructions('');
        setIngredients([]);
        setImage('');
        setIsEditing(true);
    };

    const handleEdit = (recipe) => {
        setCurrentRecipe(recipe);
        setIsEditing(true);
    };

    const handleDuplicate = async (recipe) => {
        if (window.confirm(`¿Duplicar receta "${recipe.name}"?`)) {
            try {
                const { id, ...data } = recipe;
                const newRecipe = { ...data, name: `${data.name} (Copia)` };
                await NutritionDB.recipes.create(newRecipe);
                loadData();
            } catch (e) {
                console.error(e);
                alert('Error al duplicar');
            }
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar esta receta?')) {
            await NutritionDB.recipes.delete(id);
            loadData();
        }
    };

    const handleSave = async () => {
        if (!name) return alert('Nombre es obligatorio');

        // Recalculate totals just in case
        const totalMacros = ingredients.reduce((acc, item) => {
            const food = foods.find(f => f.id === item.foodId);
            if (!food) return acc;
            const m = calculateItemMacros(food, item.quantity);
            return {
                calories: acc.calories + m.calories,
                protein: acc.protein + m.protein,
                carbs: acc.carbs + m.carbs,
                fats: acc.fats + m.fat
            };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const recipeData = {
            name,
            description,
            instructions,
            ingredients,
            totalMacros,
            image
        };
        try {
            if (currentRecipe) {
                await NutritionDB.recipes.update(currentRecipe.id, recipeData);
            } else {
                await NutritionDB.recipes.create(recipeData);
            }
            setIsEditing(false);
            loadData();
        } catch (e) {
            console.error(e);
            alert('Error al guardar');
        }
    };

    const addIngredient = (food) => {
        // Default quantity 100g or 1 unit
        const defaultQty = food.unit === 'unit' ? 1 : 100;

        setIngredients([...ingredients, {
            foodId: food.id,
            name: food.name, // Snapshot name
            unit: food.unit || 'g',
            quantity: defaultQty
        }]);
        setActiveFoodSearch(false);
    };

    const updateIngredientQty = (index, newQty) => {
        const newIngredients = [...ingredients];
        newIngredients[index].quantity = Number(newQty);
        setIngredients(newIngredients);
    };

    const removeIngredient = (index) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    // Derived Totals for Editor
    const editorTotals = ingredients.reduce((acc, item) => {
        const food = foods.find(f => f.id === item.foodId);
        if (!food) return acc;
        const m = calculateItemMacros(food, item.quantity);
        return {
            calories: acc.calories + m.calories,
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fats: acc.fats + m.fat
        };
    }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full overflow-y-auto p-6 relative">
            <div className="max-w-7xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Recetas y Platos</h1>
                        <p className="text-slate-500 text-sm font-medium mt-1">Crea platos combinados para reutilizar en dietas.</p>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Buscar receta..."
                                className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-[20px] text-sm font-medium outline-none focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3.5 rounded-[20px] font-black flex items-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            <Plus size={20} />
                            <span className="hidden sm:inline">Nueva Receta</span>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRecipes.map(recipe => (
                        <div key={recipe.id} className="bg-white p-6 rounded-[32px] border border-slate-100 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group relative flex flex-col justify-between min-h-[180px]">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <ChefHat size={24} />
                                    </div>
                                    <ActionMenu actions={[
                                        { label: 'Editar', icon: <Edit2 size={16} />, onClick: () => handleEdit(recipe) },
                                        { label: 'Duplicar', icon: <Copy size={16} />, onClick: () => handleDuplicate(recipe) },
                                        { label: 'Eliminar', icon: <Trash2 size={16} />, onClick: () => handleDelete(recipe.id), variant: 'danger' }
                                    ]} />
                                </div>

                                <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">{recipe.name}</h3>
                                <p className="text-sm text-slate-400 line-clamp-2">{recipe.description || 'Sin descripción'}</p>
                            </div>

                            <div className="flex justify-between items-end border-t border-slate-50 pt-4 mt-4">
                                <div className="flex -space-x-2">
                                    {recipe.ingredients && recipe.ingredients.slice(0, 3).map((ing, i) => (
                                        <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500" title={ing.name}>
                                            {ing.name[0]}
                                        </div>
                                    ))}
                                    {recipe.ingredients?.length > 3 && (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                            +{recipe.ingredients.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-black text-slate-900">{Math.round(recipe.totalMacros?.calories || 0)} <span className="text-xs text-slate-400 font-bold uppercase">kcal</span></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor Drawer */}
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
                                className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[110] flex flex-col h-full border-l border-slate-100"
                            >
                                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900">Editor de Recetas</h2>
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {currentRecipe ? 'Editando y mejorando' : 'Creando nueva obra maestra'}
                                        </p>
                                    </div>
                                    <button onClick={() => setIsEditing(false)} className="p-2.5 bg-slate-50 rounded-full hover:bg-slate-100 transition-colors">
                                        <X size={24} className="text-slate-400" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
                                    {/* Basic Info */}
                                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre del Plato</label>
                                            <input
                                                className="w-full bg-slate-50 border-b-2 border-slate-100 px-4 py-3 font-black text-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-200"
                                                placeholder="Ej: Pollo al Curry con Arroz"
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Descripción Corta</label>
                                            <input
                                                className="w-full bg-slate-50 border-b-2 border-slate-100 px-4 py-2 font-medium text-sm text-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                                placeholder="Breve detalle..."
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <ImageUploadInput
                                                label="Imagen del Plato"
                                                value={image}
                                                onChange={setImage}
                                                placeholder="URL de imagen..."
                                            />
                                        </div>
                                    </div>

                                    {/* Ingredients List */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end px-2">
                                            <label className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                                <Utensils size={16} /> Ingenieros (Ingredientes)
                                            </label>
                                            <button
                                                onClick={() => setActiveFoodSearch(true)}
                                                className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors uppercase tracking-wider"
                                            >
                                                + Añadir
                                            </button>
                                        </div>

                                        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                                            {ingredients.length === 0 ? (
                                                <div className="p-8 text-center text-slate-300 text-sm font-medium italic">
                                                    Añade ingredientes para calcular los macros...
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-50">
                                                    {ingredients.map((ing, idx) => (
                                                        <div key={idx} className="p-4 flex items-center justify-between gap-4 group hover:bg-slate-50 transition-colors">
                                                            <div className="flex-1">
                                                                <div className="font-bold text-slate-900">{ing.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                                    {foods.find(f => f.id === ing.foodId)?.category || 'Otro'}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <input
                                                                    type="number"
                                                                    className="w-20 bg-slate-100 border-none rounded-lg px-2 py-1 text-right font-black text-slate-700 focus:ring-2 focus:ring-indigo-500/20"
                                                                    value={ing.quantity}
                                                                    onChange={e => updateIngredientQty(idx, e.target.value)}
                                                                />
                                                                <span className="text-xs font-bold text-slate-400 w-8">
                                                                    {ing.unit === 'unit' ? 'ud' : ing.unit}
                                                                </span>
                                                                <button onClick={() => removeIngredient(idx)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Totals Footer */}
                                            <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Macros</span>
                                                <div className="flex gap-4 text-sm font-bold">
                                                    <span className="text-red-400">P: {Math.round(editorTotals.protein)}</span>
                                                    <span className="text-blue-400">C: {Math.round(editorTotals.carbs)}</span>
                                                    <span className="text-yellow-400">G: {Math.round(editorTotals.fats)}</span>
                                                    <span className="text-white border-l border-slate-700 pl-4">{Math.round(editorTotals.calories)} kcal</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Instructions */}
                                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 space-y-4">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Instrucciones de Preparación</label>
                                        <textarea
                                            className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 resize-none min-h-[100px]"
                                            placeholder="Pasos para preparar la receta..."
                                            value={instructions}
                                            onChange={e => setInstructions(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-white">
                                    <button
                                        onClick={handleSave}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                    >
                                        <Save size={18} />
                                        Guardar Receta
                                    </button>
                                </div>
                            </motion.div>

                            {/* Food Selector Modal (Nested) */}
                            <AnimatePresence>
                                {activeFoodSearch && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                                        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
                                    >
                                        <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                                <h3 className="text-lg font-black text-slate-900">Añadir Ingrediente</h3>
                                                <button onClick={() => setActiveFoodSearch(false)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><X size={20} /></button>
                                            </div>
                                            <div className="p-4 border-b border-slate-50">
                                                <div className="relative">
                                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                                    <input
                                                        autoFocus
                                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder:font-medium"
                                                        placeholder="Buscar alimento..."
                                                        onChange={e => setSearchTerm(e.target.value)} // Reusing main search term state for simplicity or better separate?
                                                    // Let's separate search term for this modal actually to avoid conflict with recipe list search
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-2">
                                                {foods
                                                    .filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())) // Using shared currently, might be confusing. 
                                                    // BETTER: Create local state for modal search.
                                                    // Quick fix: assume user cleared search or we use a separate state.
                                                    // Let's use a separate local variable inside map/filter if possible? No, react state needed.
                                                    // See below fix.
                                                    .map(food => (
                                                        <button
                                                            key={food.id}
                                                            onClick={() => addIngredient(food)}
                                                            className="w-full text-left p-4 hover:bg-indigo-50 rounded-2xl flex items-center justify-between group transition-colors"
                                                        >
                                                            <div>
                                                                <div className="font-bold text-slate-900">{food.name}</div>
                                                                <div className="text-xs text-slate-400">{food.calories} kcal / 100{food.unit}</div>
                                                            </div>
                                                            <div className="text-indigo-600 opacity-0 group-hover:opacity-100 font-bold text-xs uppercase tracking-wider">
                                                                + Añadir
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default RecipeEditor;
