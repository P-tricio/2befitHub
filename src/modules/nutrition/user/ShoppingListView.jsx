
import React, { useState, useEffect } from 'react';
import { ShoppingBasket, X, Check, Copy, Loader2, Share2, ClipboardCheck, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { ShoppingListService } from '../services/shoppingListService';

const ShoppingListView = ({ dayIds, title = 'Lista de la Compra', onClose }) => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [boughtItems, setBoughtItems] = useState({});
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadShoppingList();
    }, [JSON.stringify(dayIds)]);

    const loadShoppingList = async () => {
        setLoading(true);
        try {
            const aggregated = await ShoppingListService.generateFromDays(dayIds);
            setItems(aggregated);

            // Load bought status from localStorage if needed (optional persistence)
            const saved = localStorage.getItem(`shopping_list_bought_${dayIds.join('_')}`);
            if (saved) setBoughtItems(JSON.parse(saved));
        } catch (error) {
            console.error('Error loading shopping list:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (refId) => {
        setBoughtItems(prev => {
            const next = { ...prev, [refId]: !prev[refId] };
            localStorage.setItem(`shopping_list_bought_${dayIds.join('_')}`, JSON.stringify(next));
            return next;
        });
    };

    const copyToClipboard = () => {
        const text = items.map(item => {
            const status = boughtItems[item.refId] ? '[X]' : '[ ]';
            return `${status} ${item.name}: ${Math.round(item.quantity)}${item.unit}`;
        }).join('\n');

        navigator.clipboard.writeText(`${title}\n\n${text}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {});

    if (!dayIds || dayIds.length === 0) return null;

    return createPortal(
        <div className="fixed inset-0 z-[6000] flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Sheet */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative w-full h-[85vh] bg-white rounded-t-[40px] shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Drag Handle */}
                <div className="w-full flex justify-center pt-4 pb-2">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                {/* Header */}
                <div className="px-8 py-4 flex justify-between items-center bg-white border-b border-slate-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                            <ShoppingBasket className="text-indigo-600" />
                            LISTA
                        </h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            {dayIds.length === 1 ? 'Menú Diario' : 'Menú Semanal'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={copyToClipboard}
                            className={`p-2.5 rounded-2xl transition-all border flex items-center justify-center
                                ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-900'}
                            `}
                        >
                            {copied ? <ClipboardCheck size={20} /> : <Copy size={20} />}
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 pb-24">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                            <span className="text-sm font-bold uppercase tracking-widest">Calculando ingredientes...</span>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                            <ShoppingBasket size={48} />
                            <span className="text-sm font-medium italic">No hay ingredientes en el plan</span>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {Object.entries(groupedItems).map(([category, catItems]) => (
                                <div key={category} className="space-y-4">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">
                                        {category}
                                    </h3>
                                    <div className="grid gap-3">
                                        {catItems.map((item) => {
                                            const isBought = !!boughtItems[item.refId];
                                            return (
                                                <motion.div
                                                    key={`${item.refId}_${item.unit}`}
                                                    onClick={() => toggleItem(item.refId)}
                                                    className={`
                                                        p-4 rounded-2xl border transition-all flex items-center gap-4 cursor-pointer
                                                        ${isBought
                                                            ? 'bg-slate-50 border-slate-100 opacity-60'
                                                            : 'bg-white border-slate-200 shadow-sm hover:shadow-md active:scale-[0.98]'
                                                        }
                                                    `}
                                                >
                                                    <div className={`
                                                        w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                                                        ${isBought ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}
                                                    `}>
                                                        {isBought && <Check size={14} className="text-white" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`font-bold text-slate-900 ${isBought ? 'line-through text-slate-400' : ''}`}>
                                                            {item.name}
                                                        </p>
                                                        <p className="text-xs text-indigo-500 font-bold">
                                                            {Math.round(item.quantity)} {item.unit}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sticky Summary Action */}
                {!loading && items.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white/95 to-transparent flex justify-center">
                        <button
                            onClick={onClose}
                            className="bg-slate-900 text-white w-full max-w-sm py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all"
                        >
                            Entendido
                        </button>
                    </div>
                )}
            </motion.div>
        </div>,
        document.body
    );
};

export default ShoppingListView;
