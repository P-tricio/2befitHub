import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Home from './components/dashboard/Home';
import Profile from './components/dashboard/Profile';
import TrainingRoutes from './modules/training/TrainingRoutes';
import TrainingAdminRoutes from './modules/training/TrainingAdminRoutes';
import InstallPWA from './components/common/InstallPWA';
import { AuthProvider } from './context/AuthContext';
import Login from './modules/auth/Login';
import PrivateRoute from './modules/auth/PrivateRoute';
import NutritionTest from './modules/nutrition/NutritionTest';

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/history",
    element: <Navigate to="/training/history" replace />,
  },
  {
    path: "/training/admin/*",
    element: (
      <PrivateRoute>
        <TrainingAdminRoutes />
      </PrivateRoute>
    ),
  },
  {
    path: "/training/*",
    element: (
      <PrivateRoute>
        <TrainingRoutes />
      </PrivateRoute>
    ),
  },
  {
    path: "/",
    element: (
      <PrivateRoute>
        <Navigate to="/training" replace />
      </PrivateRoute>
    ),
  },
  {
    path: "/hub",
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      { index: true, element: <Home /> },
    ],
  },
  {
    path: "/profile",
    element: (
      <PrivateRoute>
        <Navigate to="/training/profile" replace />
      </PrivateRoute>
    ),
  },
  {
    path: "/nutrition-test",
    element: (
      <NutritionTest />
    ),
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

function App() {
  return (
    <AuthProvider>
      <InstallPWA />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
