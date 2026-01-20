import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Shield, LogOut, Settings, Award, ChevronRight, Edit2, ArrowRight } from 'lucide-react';

const Profile = () => {
    const { currentUser, logout, updateUserProfile } = useAuth();
    const [isEditing, setIsEditing] = React.useState(false);
    const [newName, setNewName] = React.useState('');

    // Safety check in case context is slow, though PrivateRoute handles this
    const user = currentUser || { displayName: 'Usuario', email: 'cargando...' };
    const initial = user.email ? user.email[0].toUpperCase() : 'U';

    const handleLogout = () => {
        if (window.confirm('¿Deseas cerrar sesión?')) {
            logout();
        }
    };

    const handleStartEdit = () => {
        setNewName(user.displayName || '');
        setIsEditing(true);
    };

    const handleSaveProfile = async () => {
        if (!newName.trim()) return;
        try {
            await updateUserProfile({ displayName: newName });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };

    return (
        <div className="p-6 space-y-8">
            <header className="flex flex-col items-center pt-8 pb-4">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl font-black text-slate-300 border-4 border-white shadow-xl mb-4">
                    {initial}
                </div>

                {isEditing ? (
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            autoFocus
                            className="text-2xl font-black text-slate-900 bg-slate-50 border border-emerald-500 rounded-lg p-1 text-center w-64 outline-none"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                        />
                        <button onClick={handleSaveProfile} className="p-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600">
                            <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 group cursor-pointer mb-2" onClick={handleStartEdit}>
                        <h1 className="text-2xl font-black text-slate-900">{user.displayName || 'Atleta 2BeFit'}</h1>
                        <div className="opacity-0 group-hover:opacity-100 p-1 bg-slate-100 rounded-full text-slate-400">
                            <Edit2 size={14} />
                        </div>
                    </div>
                )}

                <p className="text-slate-400 font-medium">{user.email}</p>

                <div className="mt-4 flex gap-2">
                    <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Nivel Intermedio</span>
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">PDP-R</span>
                </div>
            </header>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4">
                <StatCard label="Sesiones" value="12" />
                <StatCard label="Racha" value="3 días" />
            </div>

            {/* Menu Options */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-50">
                    <ProfileLink icon={User} label="Datos Personales" onClick={handleStartEdit} />
                    <ProfileLink icon={Award} label="Historial de Logros" />
                    <ProfileLink icon={Settings} label="Configuración" />
                    <ProfileLink icon={Shield} label="Privacidad" />
                </div>
            </div>

            {/* Danger Zone */}
            <button
                onClick={handleLogout}
                className="w-full bg-red-50 text-red-500 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
                <LogOut size={20} />
                Cerrar Sesión
            </button>

            <p className="text-center text-xs text-slate-300 py-4">
                Version 1.0.0 Alpha • ID: {user.uid?.slice(0, 6)}
            </p>
        </div>
    );
};

const StatCard = ({ label, value }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-2xl font-black text-slate-900">{value}</div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{label}</div>
    </div>
);

const ProfileLink = ({ icon: Icon, label, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-white group-hover:text-emerald-500 transition-colors shadow-sm">
                <Icon size={20} />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-slate-900">{label}</span>
        </div>
        <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" />
    </button>
);

export default Profile;
