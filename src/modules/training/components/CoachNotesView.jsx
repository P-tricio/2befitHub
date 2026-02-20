import React, { useState, useEffect } from 'react';
import { TrainingDB } from '../services/db';
import { Plus, Trash2, Calendar, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

const CoachNotesView = ({ user, onUpdate }) => {
    const [notes, setNotes] = useState(user.coachNotes || []);
    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state if user prop changes
    useEffect(() => {
        setNotes(user.coachNotes || []);
    }, [user.coachNotes]);

    const handleAddNote = async () => {
        if (!newNote.trim()) return;

        setIsSaving(true);
        const noteObj = {
            id: Date.now().toString(),
            text: newNote.trim(),
            createdAt: new Date().toISOString()
        };

        const updatedNotes = [noteObj, ...notes];

        try {
            await TrainingDB.users.updateProfile(user.id, { coachNotes: updatedNotes });
            setNotes(updatedNotes);
            setNewNote('');
            if (onUpdate) onUpdate({ ...user, coachNotes: updatedNotes });
        } catch (error) {
            console.error('Error saving note:', error);
            alert('Error al guardar la nota');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('¿Estás seguro de que quieres eliminar esta nota?')) return;

        const updatedNotes = notes.filter(n => n.id !== noteId);

        try {
            await TrainingDB.users.updateProfile(user.id, { coachNotes: updatedNotes });
            setNotes(updatedNotes);
            if (onUpdate) onUpdate({ ...user, coachNotes: updatedNotes });
        } catch (error) {
            console.error('Error deleting note:', error);
            alert('Error al eliminar la nota');
        }
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="relative group">
                    <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Escribe una nueva nota o necesidad específica del atleta..."
                        className="w-full h-32 p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-sm font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                    />
                    <div className="absolute bottom-4 right-4 flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                            {newNote.length > 0 ? `${newNote.length} carácteres` : ''}
                        </span>
                        <button
                            onClick={handleAddNote}
                            disabled={!newNote.trim() || isSaving}
                            className={`
                                flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                ${newNote.trim() && !isSaving ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                            `}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    <span>Guardando...</span>
                                </>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    <span>Añadir Nota</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="space-y-4">
                {notes.length === 0 ? (
                    <div className="py-20 text-center space-y-4 bg-white/50 rounded-[3rem] border border-dashed border-slate-200">
                        <ClipboardList size={48} className="mx-auto text-slate-200" />
                        <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay notas registradas aún</p>
                    </div>
                ) : (
                    notes.map((note, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={note.id}
                            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm group hover:border-indigo-100 transition-all"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                                            <Calendar size={12} className="text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                {format(new Date(note.createdAt), 'dd MMMM yyyy HH:mm', { locale: es })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
                                        {note.text}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CoachNotesView;
