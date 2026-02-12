import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2, Check, X } from 'lucide-react';
import {
    isNotificationSupported,
    getNotificationPermission,
    requestNotificationPermission,
    removeNotificationToken
} from '../../services/notificationService';

/**
 * NotificationToggle - Component to enable/disable push notifications
 * @param {string} userId - The current user's ID
 * @param {boolean} compact - Show compact version (icon only)
 */
const NotificationToggle = ({ userId, variant = 'default', compact = false }) => {
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setSupported(isNotificationSupported());
        setPermission(getNotificationPermission());
    }, []);

    const handleToggle = async () => {
        if (!userId) return;
        setLoading(true);

        try {
            if (permission === 'granted') {
                // Disable notifications
                await removeNotificationToken(userId);
                setPermission('default');
            } else {
                // Request permission
                const token = await requestNotificationPermission(userId);
                if (token) {
                    setPermission('granted');
                } else {
                    setPermission(getNotificationPermission());
                }
            }
        } catch (error) {
            console.error('Error toggling notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Not supported - don't render
    if (!supported) {
        return null;
    }

    const isEnabled = permission === 'granted';

    // Permission denied by browser - show disabled state
    if (permission === 'denied') {
        const DeniedContent = () => (
            <>
                <div className={`p-2 rounded-lg bg-slate-100 text-slate-400`}>
                    <BellOff size={20} />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-slate-400">Notificaciones bloqueadas</p>
                    <p className="text-[10px] text-slate-300 uppercase font-black">Revisa el navegador</p>
                </div>
            </>
        );

        if (variant === 'row') {
            return (
                <div className="w-full flex items-center gap-4 p-4 opacity-60 grayscale cursor-not-allowed">
                    <DeniedContent />
                </div>
            );
        }

        return (
            <div className={`flex items-center gap-2 ${compact ? '' : 'p-3 bg-slate-100 rounded-xl'}`}>
                <BellOff size={18} className="text-slate-400" />
                {!compact && (
                    <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500">Notificaciones bloqueadas</p>
                        <p className="text-[10px] text-slate-400">Habilítalas en la configuración del navegador</p>
                    </div>
                )}
            </div>
        );
    }

    if (compact) {
        return (
            <button
                onClick={handleToggle}
                disabled={loading}
                className={`p-2 rounded-full transition-colors ${isEnabled
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
            >
                {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : isEnabled ? (
                    <Bell size={18} />
                ) : (
                    <BellOff size={18} />
                )}
            </button>
        );
    }

    // New "row" variant for Profile menu integration
    if (variant === 'row') {
        return (
            <button
                onClick={handleToggle}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors shadow-sm ${isEnabled ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-emerald-500'}`}>
                        {isEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                    </div>
                    <div className="text-left">
                        <span className={`block font-bold group-hover:text-slate-900 ${isEnabled ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {isEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}
                        </span>
                        <span className="block text-[10px] font-black text-slate-300 uppercase tracking-wider">Recordatorios y avisos</span>
                    </div>
                </div>

                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-emerald-500' : 'bg-slate-200 group-hover:bg-slate-300'}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 size={10} className="animate-spin text-white" />
                        </div>
                    )}
                </div>
            </button>
        );
    }

    return (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isEnabled ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    {isEnabled ? (
                        <Bell size={18} className="text-emerald-600" />
                    ) : (
                        <BellOff size={18} className="text-slate-400" />
                    )}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-700">Notificaciones Push</p>
                    <p className="text-[10px] text-slate-400">
                        {isEnabled ? 'Recibirás recordatorios y avisos' : 'Actívalas para no perderte nada'}
                    </p>
                </div>
            </div>
            <button
                onClick={handleToggle}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isEnabled
                    ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : isEnabled ? (
                    'Desactivar'
                ) : (
                    'Activar'
                )}
            </button>
        </div>
    );
};

export default NotificationToggle;
