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
const NotificationToggle = ({ userId, compact = false }) => {
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

    // Permission denied by browser - show disabled state
    if (permission === 'denied') {
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

    const isEnabled = permission === 'granted';

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
