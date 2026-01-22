import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import GlobalCreator from './admin/GlobalCreator';
import UserManager from './admin/UserManager';
import ProgramBuilder from './admin/ProgramBuilder';
import ControlHub from './admin/ControlHub';

// Note: ExerciseManager, ModuleBuilder, and SessionBuilder have been consolidated into GlobalCreator
// Old paths redirect to global-creator for backward compatibility

const TrainingAdminRoutes = () => {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="users" replace />} />
                {/* Legacy redirects - these features are now in GlobalCreator */}
                <Route path="exercises" element={<Navigate to="/training/admin/global-creator" replace />} />
                <Route path="modules" element={<Navigate to="/training/admin/global-creator" replace />} />
                <Route path="sessions" element={<Navigate to="/training/admin/global-creator" replace />} />
                {/* Active routes */}
                <Route path="global-creator" element={<GlobalCreator />} />
                <Route path="programs" element={<ProgramBuilder />} />
                <Route path="users" element={<UserManager />} />
                <Route path="forms" element={<ControlHub />} />
            </Route>
        </Routes>
    );
};

export default TrainingAdminRoutes;
