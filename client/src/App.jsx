import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import RegisterPage from "./RegisterPage";
import SignInPage from "./SignInPage";
import SystemAdminDashboard from "./pages/admin/systemAdminDashboard";
import UserDashboard from "./UserDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFoundPage from "./components/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
        <Route path="/userDashboard" element={<UserDashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
        <Route path="/admin/dashboard" element={<SystemAdminDashboard />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
