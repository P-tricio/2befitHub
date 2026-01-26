import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bell, Info } from 'lucide-react';
import { TrainingDB } from '../../services/db';

const SendNotificationModal = ({ user, onClose }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title || !message) {
            alert("Por favor completa el título y el mensaje");
            return;
        }

        setSending(true);
        try {
            await TrainingDB.notifications.create(user.id, {
                type: 'admin_alert',
                title: title,
                message: message,
                senderName: 'Coach'
            });
            onClose(true);
        } catch (error) {
            console.error("Error sending notification:", error);
            alert("Error al enviar la notificación");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => onClose(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden relative z-10 shadow-2xl border border-slate-100"
            >
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-900 text-xl tracking-tight">Enviar Alerta</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Para: {user.displayName}</p>
                        </div>
                    </div>
                    <button onClick={() => onClose(false)} className="p-2 bg-white rounded-full hover:bg-slate-50 border border-slate-100 transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-50 rounded-3xl p-5 border border-amber-100 flex gap-4">
                        <Info size={20} className="text-amber-500 shrink-0" />
                        <p className="text-xs font-medium text-amber-800 leading-relaxed">
                            Esta notificación aparecerá en la campana de avisos del atleta en su pantalla de inicio.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Título del aviso</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Nueva sesión disponible"
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-900 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mensaje</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe el contenido de la notificación..."
                                rows={4}
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-slate-700 focus:border-indigo-500 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={sending || !title || !message}
                        className={`w-full py-5 rounded-[1.8rem] font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl
                            ${sending || !title || !message
                                ? 'bg-slate-100 text-slate-300 shadow-none'
                                : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'
                            }`}
                    >
                        {sending ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                        ) : (
                            <>
                                <Send size={20} />
                                ENVIAR NOTIFICACIÓN
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SendNotificationModal;
