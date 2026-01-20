import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

/**
 * Hook to prevent accidental navigation when there are unsaved changes.
 * Handles both React Router navigation and browser window close/refresh.
 * 
 * @param {boolean} isDirty - Whether there are unsaved changes.
 * @param {string} message - Message to display in the confirmation dialog.
 */
export const useUnsavedChanges = (isDirty, message = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?') => {

    // 1. Handle Browser Navigation (Refresh, Close Tab, Back Button out of app)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };

        if (isDirty) {
            window.addEventListener('beforeunload', handleBeforeUnload);
        }

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, message]);

    // 2. Handle React Router Navigation
    // useBlocker returns { state: "unblocked" | "blocked" | "proceeding", proceed, reset }
    const blocker = useBlocker(
        ({ currentLocation, nextLocation }) =>
            isDirty && currentLocation.pathname !== nextLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === "blocked") {
            // Using native confirm for simplicity and reliability across blocking
            // For custom UI, we'd need to expose the blocker state to the component
            const confirm = window.confirm(message);
            if (confirm) {
                blocker.proceed();
            } else {
                blocker.reset();
            }
        }
    }, [blocker, message]);

    return blocker;
};
