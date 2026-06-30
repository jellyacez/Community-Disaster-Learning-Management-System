import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const SignInPage = lazy(() => import("./pages/auth/SignInPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPromptPage = lazy(() => import("./pages/auth/VerifyEmailPromptPage"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const AdminMfaSetupPage = lazy(() => import("./pages/auth/AdminMfaSetupPage"));

const SystemAdminDashboard = lazy(() => import("./pages/admin/SystemAdminDashboard"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserAnnouncements = lazy(() => import("./pages/user/UserAnnouncements"));
const UserModuleCatalog = lazy(() => import("./pages/user/UserModuleCatalog"));
const UserEnrolledModules = lazy(() => import("./pages/user/UserEnrolledModules"));
const ModuleViewer = lazy(() => import("./pages/user/ModuleViewer"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const UserSettings = lazy(() => import("./pages/user/UserSettings"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));

// Admin Layouts
const BarangayAdminDashboard = lazy(() => import("./pages/admin/barangay/BarangayAdminDashboard"));
const MdrrmoAdminDashboard = lazy(() => import("./pages/admin/mdrrmo/MdrrmoAdminDashboard"));

// MDRRMO Components
const MdrrmoOverview = lazy(() => import("./pages/admin/mdrrmo/overview/Overview"));
const MdrrmoBarangayManagement = lazy(() => import("./pages/admin/mdrrmo/barangay-management/BarangayManagement"));
const MdrrmoModuleManagement = lazy(() => import("./pages/admin/mdrrmo/module-management/ModuleManagement"));
const MdrrmoUserManagement = lazy(() => import("./pages/admin/mdrrmo/user-management/UserManagement"));
const LiveAlerts = lazy(() => import("./pages/admin/mdrrmo/LiveAlerts"));

// Barangay Components
const BarangayWorkspaceOverview = lazy(() => import("./pages/admin/barangay/workspace/WorkspaceOverview"));
const BarangayResidentRegistry = lazy(() => import("./pages/admin/barangay/registry/ResidentRegistry"));
const BarangayCategoryConfig = lazy(() => import("./pages/admin/barangay/categories/CategoryConfig"));
const BarangaySystemLogs = lazy(() => import("./pages/admin/barangay/logs/SystemLogs"));
const BarangayActiveSyllabus = lazy(() => import("./pages/admin/barangay/syllabus/ActiveSyllabus"));

import ProtectedRoute from "./components/auth/ProtectedRoute";
import UserLayout from "./components/layouts/UserLayout";
import AdminLayout from "./components/layouts/AdminLayout";

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
            <Route path="/user/modules/:moduleId" element={<ModuleViewer />} />
            <Route element={<UserLayout />}>
              <Route path="/userDashboard" element={<UserDashboard />} />
              <Route path="/user/announcements" element={<UserAnnouncements />} />
              <Route path="/user/modules" element={<UserModuleCatalog />} />
              <Route path="/user/enrolled" element={<UserEnrolledModules />} />
              <Route path="/user/profile" element={<UserProfile />} />
              <Route path="/user/settings" element={<UserSettings />} />
            </Route>
          </Route>

          <Route element={<AdminLayout />}>
            <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
              <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["mdrrmo_admin"]} />}>
              <Route path="/admin/mdrrmo" element={<MdrrmoAdminDashboard />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<MdrrmoOverview />} />
                <Route path="barangay-management" element={<MdrrmoBarangayManagement />} />
                <Route path="modules" element={<MdrrmoModuleManagement />} />
                <Route path="users" element={<MdrrmoUserManagement />} />
                <Route path="alerts" element={<LiveAlerts />} />
                <Route path="overview" element={<Navigate to="dashboard" replace />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute allowedRoles={["barangay_admin"]} />}>
              <Route path="/admin/barangay" element={<BarangayAdminDashboard />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<BarangayWorkspaceOverview />} />
                <Route path="registry" element={<BarangayResidentRegistry />} />
                <Route path="categories" element={<BarangayCategoryConfig />} />
                <Route path="logs" element={<BarangaySystemLogs />} />
                <Route path="syllabus" element={<BarangayActiveSyllabus />} />
                <Route path="workspace" element={<Navigate to="dashboard" replace />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
