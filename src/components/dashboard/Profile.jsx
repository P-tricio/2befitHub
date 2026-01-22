import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, LogOut, Settings, Award, ChevronRight, Edit2, ArrowRight, ShieldCheck } from 'lucide-react';

const Profile = () => {
    const { currentUser, logout, updateUserProfile } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = React.useState(false);
    const [newName, setNewName] = React.useState('');
    const [newPhotoURL, setNewPhotoURL] = React.useState('');

    const [uploading, setUploading] = React.useState(false);

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
        setNewPhotoURL(user.photoURL || '');
        setIsEditing(true);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);

        try {
            // Convert to Base64 to avoid potential FormData/File object issues with some browser extensions
            const toBase64 = (file) => new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
            });

            const base64File = await toBase64(file);
            const base64Data = base64File.split(',')[1];

            const formData = new FormData();
            formData.append('image', base64Data);

            const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.success) {
                setNewPhotoURL(data.data.url);
            } else {
                console.error('ImgBB Upload Error:', data);
                // Show specific error from API if available
                const errorMsg = data.error ? (data.error.message || data.error) : 'Error desconocido';
                alert(`Error al subir imagen (ImgBB): ${errorMsg}`);
            }
        } catch (error) {
            console.error('Upload Exception:', error);
            alert('Error de conexión al subir imagen. Revisa la consola para más detalles.');
        } finally {
            setUploading(false);
            // Reset input value to allow selecting same file again if needed
            e.target.value = '';
        }
    };

    const handleSaveProfile = async () => {
        if (!newName.trim()) return;
        try {
            await updateUserProfile({
                displayName: newName,
                photoURL: newPhotoURL.trim() || null
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
            alert('Error al actualizar perfil');
        }
    };

    return (
        <div className="p-6 space-y-8">
            <header className="flex flex-col items-center pt-8 pb-4">
                <div className="relative mb-4 group">
                    {user.photoURL || newPhotoURL ? (
                        <img
                            src={isEditing && newPhotoURL ? newPhotoURL : user.photoURL}
                            alt="Profile"
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl bg-slate-100"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                // This assumes sibling is the fallback div
                            }}
                        />
                    ) : null}

                    {/* Fallback Initial */}
                    <div className={`w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-4xl font-black text-slate-300 border-4 border-white shadow-xl ${(user.photoURL || newPhotoURL) ? 'hidden' : 'flex'}`}>
                        {initial}
                    </div>

                    {/* Edit Overlay for Photo */}
                    {isEditing && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            {uploading ? (
                                <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <span className="text-white text-xs font-bold">Cambiar</span>
                            )}
                        </label>
                    )}
                </div>

                {isEditing ? (
                    <div className="flex flex-col gap-3 w-full max-w-xs items-center">
                        <input
                            autoFocus
                            className="text-lg font-bold text-slate-900 bg-slate-50 border border-emerald-500 rounded-lg p-2 text-center w-full outline-none"
                            placeholder="Nombre de usuario"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />

                        <p className="text-xs text-slate-400 font-medium">
                            Pulsa en tu foto para cambiarla
                        </p>

                        <button onClick={handleSaveProfile} className="px-6 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 font-bold flex items-center gap-2" disabled={uploading}>
                            <ArrowRight size={16} /> Guardar Cambios
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


            </header>



            {/* Menu Options */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-50">
                    <ProfileLink icon={User} label="Datos Personales" onClick={handleStartEdit} />
                    <ProfileLink icon={Award} label="Historial de Logros" />

                    {/* Admin Panel Button - Only for admins (or dev override) */}
                    {(user.role === 'admin' || user.email === 'pabloadrian91@gmail.com') && (
                        <ProfileLink
                            icon={ShieldCheck}
                            label="Panel de Administración"
                            onClick={() => navigate('/training/admin/global-creator')}
                            className="bg-indigo-50/50"
                        />
                    )}

                    <ProfileLink icon={Settings} label="Configuración" />
                    <ProfileLink icon={Shield} label="Privacidad" />
                    <div className="my-2 border-t border-slate-50"></div>
                    <ProfileLink
                        icon={ArrowRight}
                        label="Volver al HUB (Módulos)"
                        onClick={() => navigate('/hub')}
                        className="text-emerald-600 bg-emerald-50/30"
                    />
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

const ProfileLink = ({ icon: Icon, label, onClick, className }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group ${className}`}>
        <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg transition-colors shadow-sm ${className ? 'bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-emerald-500'}`}>
                <Icon size={20} />
            </div>
            <span className={`font-bold group-hover:text-slate-900 ${className ? 'text-indigo-600' : 'text-slate-700'}`}>{label}</span>
        </div>
        <ChevronRight size={16} className={`transform group-hover:translate-x-1 transition-all ${className ? 'text-indigo-300 group-hover:text-indigo-500' : 'text-slate-300 group-hover:text-emerald-500'}`} />
    </button>
);

export default Profile;
