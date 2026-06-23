import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const SignInPage = lazy(() => import("./pages/auth/SignInPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPromptPage = lazy(() => import("./pages/auth/VerifyEmailPromptPage"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const AdminMfaSetupPage = lazy(() => import("./pages/auth/AdminMfaSetupPage"));

const SystemAdminDashboard = lazy(() => import("./pages/admin/systemAdminDashboard"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserAnnouncements = lazy(() => import("./pages/user/UserAnnouncements"));
const UserModuleCatalog = lazy(() => import("./pages/user/UserModuleCatalog"));
const UserEnrolledModules = lazy(() => import("./pages/user/UserEnrolledModules"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const UserSettings = lazy(() => import("./pages/user/UserSettings"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));

import ProtectedRoute from "./components/auth/ProtectedRoute";
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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/admin/mfa-setup" element={<AdminMfaSetupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email-prompt" element={<VerifyEmailPromptPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

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
      </Suspense>
    </>
  );
}
