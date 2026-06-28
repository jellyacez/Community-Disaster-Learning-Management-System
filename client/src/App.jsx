import React from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LandingPage from "./LandingPage";
import RegisterPage from "./RegisterPage";
import SignInPage from "./SignInPage";
import ModulePreview from "./pages/admin/ModulePreview";
import SystemAdminDashboard from "./pages/admin/systemAdminDashboard";

// 📁 Capitalized the local variables so React can render them normally as tags
import MdrrmoDashboard from "./pages/admin/MDRRMO-admin.jsx"; 
import BarangayAdminDashboard from "./pages/admin/barangay-admin.jsx"; 

import UserDashboard from "./pages/user/UserDashboard";
import UserAnnouncements from "./pages/user/UserAnnouncements";
import UserModuleCatalog from "./pages/user/UserModuleCatalog";
import UserEnrolledModules from "./pages/user/UserEnrolledModules";
import UserProfile from "./pages/user/UserProfile";
import UserSettings from "./pages/user/UserSettings";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./components/NotFoundPage";

import UserLayout from "./pages/user/components/UserLayout";

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
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signin" element={<SignInPage />} />

        {/* Resident user routes */}
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

        {/* System Admin route */}
        <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
          <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
        </Route>

{/* Slide it out here temporarily to bypass security checks */}
<Route path="/mdrrmo/dashboard" element={<MdrrmoDashboard />} />

{/* The protected wrapper stays intact below */}
<Route element={<ProtectedRoute allowedRoles={["mdrrmo_admin"]} />}>
  {/* Clear or comment out the route from inside here so it doesn't duplicate */}
</Route>

            {/* Move it out here temporarily to bypass security */}
<Route path="/barangay/dashboard" element={<BarangayAdminDashboard />} />

{/* The rest of the protected block remains untouched below */}
<Route element={<ProtectedRoute allowedRoles={["barangay_admin"]} />}>
  {/* Clear or comment it out from inside here so it doesn't conflict */}
</Route>

        <Route path="/test-module-view" element={<ModulePreview />} />

        {/* Fallback 404 Page */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}