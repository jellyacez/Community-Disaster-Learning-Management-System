import React from 'react';
import { Routes, Route } from 'react-router-dom';

import LandingPage from './LandingPage';
import RegisterPage from './RegisterPage';
import SignInPage from './SignInPage';

import UserDashboard from './pages/user/UserDashboard';
import UserAnnouncements from './pages/user/UserAnnouncements';
import UserModuleCatalog from './pages/user/UserModuleCatalog';
import UserEnrolledModules from './pages/user/UserEnrolledModules';
import UserProfile from './pages/user/UserProfile';
import UserSettings from './pages/user/UserSettings';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signin" element={<SignInPage />} />

      <Route path="/userDashboard" element={<UserDashboard />} />
      <Route path="/user/announcements" element={<UserAnnouncements />} />
      <Route path="/user/modules" element={<UserModuleCatalog />} />
      <Route path="/user/enrolled" element={<UserEnrolledModules />} />
      <Route path="/user/profile" element={<UserProfile />} />
      <Route path="/user/settings" element={<UserSettings />} />
    </Routes>
  );
}