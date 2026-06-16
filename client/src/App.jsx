import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LandingPage from "./pages/public/LandingPage";
import RegisterPage from "./pages/auth/RegisterPage";
import SignInPage from "./pages/auth/SignInPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";

import SystemAdminDashboard from "./pages/admin/systemAdminDashboard";
import UserDashboard from "./pages/user/UserDashboard";
import UserAnnouncements from "./pages/user/UserAnnouncements";
import UserModuleCatalog from "./pages/user/UserModuleCatalog";
import UserEnrolledModules from "./pages/user/UserEnrolledModules";
import UserProfile from "./pages/user/UserProfile";
import UserSettings from "./pages/user/UserSettings";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import NotFoundPage from "./pages/public/NotFoundPage";

import UserLayout from "./components/layouts/UserLayout";

export default function App() {
  return (
    <>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 3000,
          style: {
            fontWeight: "bold",
            padding: "16px",
            borderRadius: "16px",
          },
          success: {
            style: {
              background: "#22c55e",
              color: "#fff",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#22c55e",
            },
          },
          error: {
            style: {
              background: "#ef4444",
              color: "#fff",
            },
            iconTheme: {
              primary: "#fff",
              secondary: "#ef4444",
            },
          },
        }} 
      />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
          <Route element={<UserLayout />}>
            <Route path="/userDashboard" element={<UserDashboard />} />
            <Route path="/user/announcements" element={<UserAnnouncements />} />
            <Route path="/user/modules" element={<UserModuleCatalog />} />
            <Route path="/user/enrolled" element={<UserEnrolledModules />} />
            <Route path="/user/profile" element={<UserProfile />} />
            <Route path="/user/settings" element={<UserSettings />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
          <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
