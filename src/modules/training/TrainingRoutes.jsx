import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SessionRunner from './runner/SessionRunner';
import AthleteLayout from './athlete/AthleteLayout';
import AthleteHome from './athlete/pages/AthleteHome';
import AthleteAgenda from './athlete/pages/AthleteAgenda';
import AthleteTracking from './athlete/pages/AthleteTracking';

// Admin Import (Lazy load or direct if needed)
import UserManager from './admin/UserManager';
// Note: Admin routes seem to be handled elsewhere or I should check if they need to be here.
// Looking at previous context, there is an "/admin" link. 
// I will assume for now I just replace the user-facing part. 
// If Admin needs to be accessible, I should ensure it's not broken.
// The previous TrainingDashboard had a link to "/training/admin". 
// This suggests the parent router handles "/training/admin" or this router should handle "admin/*".
// The previous file didn't have "admin" route, so "admin" must be a sibling or handled by App.jsx.
// Wait, TrainingDashboard had <Link to="/training/admin">.
// If TrainingRoutes handles "/training/*", then "admin" would be caught by "*".
// Let's check where Admin routes are defined. PROBABLY inside this file?
// The previous file content was:
// <Route index element={<TrainingDashboard />} />
// <Route path="session/:sessionId" element={<SessionRunner />} />
// <Route path="*" element={<Navigate to="" replace />} />
// So "admin" was NOT handled here. It might be handled in the parent App.jsx.
// Or maybe specific admin routes were missing here?
// I will check App.jsx later if needed. For now I replace the user part.

const TrainingRoutes = () => {
    return (
        <Routes>
            <Route element={<AthleteLayout />}>
                <Route index element={<AthleteHome />} />
                <Route path="agenda" element={<AthleteAgenda />} />
                <Route path="tracking" element={<AthleteTracking />} />
                <Route path="shop" element={<div className='p-6 text-center text-slate-400'>Tienda (Próximamente)</div>} />
                <Route path="bookings" element={<div className='p-6 text-center text-slate-400'>Reservas (Próximamente)</div>} />
                <Route path="nutrition" element={<div className='p-6 text-center text-slate-400'>Nutrición (Próximamente)</div>} />
            </Route>

            <Route path="session/:sessionId" element={<SessionRunner />} />

            <Route path="*" element={<Navigate to="" replace />} />
        </Routes>
    );
};

export default TrainingRoutes;
