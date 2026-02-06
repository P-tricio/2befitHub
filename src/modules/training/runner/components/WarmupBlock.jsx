import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const WarmupBlock = ({ step, plan, onComplete, isProcessing }) => {
    const { module } = step;
    const [weights, setWeights] = useState(['', '', '']);

    // Auto-calculate Weights from Plan
    useEffect(() => {
        if (plan) {
            // Use first exercise as reference
            const referenceWeight = parseFloat(plan[0]);
            if (!isNaN(referenceWeight) && referenceWeight > 0) {
                setWeights([
                    Math.round(referenceWeight * 0.4).toString(),
                    Math.round(referenceWeight * 0.6).toString(),
                    Math.round(referenceWeight * 0.8).toString()
                ]);
            }
        }
    }, [plan]);

    const handleWeightChange = (idx, val) => {
        const newW = [...weights];
        newW[idx] = val;
        setWeights(newW);
    };
    return (
        <div className="flex-1 flex flex-col">
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 rounded-full border border-orange-500/20 mb-4">
                    <AlertCircle size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">Activación</span>
                </div>
                <h2 className="text-3xl font-black text-white mb-2 leading-tight">Series de Aproximación</h2>
                <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                    Prepara el movimiento para <strong>{module.exerciseNames?.join(' + ') || 'el bloque'}</strong>.
                </p>
                {/* Visual indicator of calculation */}
                {plan?.[0] ?
                    <p className="text-[10px] uppercase text-emerald-500 font-bold mt-2">
                        Calculado para RM: {plan[0]}kg
                    </p>
                    :
                    <p className="text-[10px] uppercase text-slate-600 font-bold mt-2">
                        Introduce peso en planificación para autocalcular
                    </p>
                }
            </div>
            <div className="space-y-4 flex-1">
                {(module.exercises?.[0]?.config?.sets || [
                    { reps: '12', pct: '40%' },
                    { reps: '6', pct: '60%' },
                    { reps: '3', pct: '80%' }
                ]).map((set, idx) => {
                    // Determine if using Time or Reps - Universal Check
                    const isTime = set.time || set.metric === 'time' || module.exercises?.[0]?.config?.volType === 'TIME' || module.exercises?.[0]?.targetTime > 0;
                    const val = isTime ? (set.time || set.reps) : (set.reps);
                    const label = isTime ? 'seg' : 'reps';
                    const intensityLabel = set.pct || (set.weight ? `${set.weight}kg` : set.rpe ? `RPE ${set.rpe}` : 'Aprox');

                    return (
                        <div key={idx} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 p-4 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-lg border border-orange-500/20">
                                {idx + 1}
                            </div>
                            <div className="flex-1">
                                <div className="text-white font-bold text-lg">{val} {label}</div>
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Intensidad {intensityLabel}</div>
                            </div>
                            <div className="w-28 relative">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={weights[idx]}
                                    onChange={(e) => handleWeightChange(idx, e.target.value)}
                                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl py-3 px-2 text-right text-white font-mono font-bold text-lg outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-slate-700"
                                />
                                <span className="absolute right-10 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 pointer-events-none">kg</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button
                onClick={onComplete}
                disabled={isProcessing}
                className={`w-full font-black text-lg py-5 rounded-2xl shadow-lg transition-all mt-8 ${isProcessing ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-900/30 active:scale-[0.98]'}`}
            >
                {isProcessing ? 'Iniciando...' : 'Listo, Comenzar Bloque'}
            </button>
        </div>
    );
};

export default WarmupBlock;
