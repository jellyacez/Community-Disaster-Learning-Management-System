import React from 'react';
import { Routes, Route } from 'react-router-dom';

import LandingPage from './LandingPage';
import RegisterPage from './RegisterPage';
import SignInPage from './SignInPage';

import SystemAdminDashboard from "./pages/admin/systemAdminDashboard";
import UserDashboard from './pages/user/UserDashboard';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserModuleCatalog from './pages/user/UserModuleCatalog';
import UserEnrolledModules from './pages/user/UserEnrolledModules';
import UserProfile from './pages/user/UserProfile';
import UserSettings from './pages/user/UserSettings';
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signin" element={<SignInPage />} />

      <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
        <Route path="/userDashboard" element={<UserDashboard />} />
        <Route path="/user/announcements" element={<UserAnnouncements />} />
        <Route path="/user/modules" element={<UserModuleCatalog />} />
        <Route path="/user/enrolled" element={<UserEnrolledModules />} />
        <Route path="/user/profile" element={<UserProfile />} />
        <Route path="/user/settings" element={<UserSettings />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
      </Route>



      {/* Catch-All Route for undefined URLs */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}