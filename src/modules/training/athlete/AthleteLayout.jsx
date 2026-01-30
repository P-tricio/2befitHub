import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from './components/BottomNavigation';

const AthleteLayout = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <div className="flex-1 pb-24"> {/* Padding bottom for navigation */}
                <Outlet />
            </div>
            <BottomNavigation />
        </div>
    );
};

export default AthleteLayout;
