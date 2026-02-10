import React, { useState } from 'react';
import FoodSearch from './components/FoodSearch';

const NutritionTest = () => {
    const [selectedItem, setSelectedItem] = useState(null);

    const handleSelect = (item) => {
        setSelectedItem(item);
        console.log('Selected Item:', item);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                        Nutrition Explorer
                    </h1>
                    <p className="text-slate-400">Componente Reutilizable (FoodSearch)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Search Component */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-xl h-[600px] border border-slate-700">
                        <FoodSearch onSelect={handleSelect} />
                    </div>

                    {/* Selection Debug */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-200">Elemento Seleccionado:</h2>
                        {selectedItem ? (
                            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                <pre className="text-xs text-emerald-400 font-mono overflow-auto max-h-96">
                                    {JSON.stringify(selectedItem, null, 2)}
                                </pre>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700 text-slate-500 text-center">
                                Selecciona un alimento para ver sus datos normalizados.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NutritionTest;
