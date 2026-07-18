import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./components/ErrorBoundary";

const LandingPage = lazy(() => import("./pages/public/LandingPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/public/PrivacyPolicyPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const SignInPage = lazy(() => import("./pages/auth/SignInPage"));
const ForgotPasswordPage = lazy(
  () => import("./pages/auth/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const VerifyEmailPromptPage = lazy(
  () => import("./pages/auth/VerifyEmailPromptPage"),
);
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));
const AdminMfaSetupPage = lazy(() => import("./pages/auth/AdminMfaSetupPage"));


const SystemAdminRoot = lazy(
  () => import("./pages/admin/system/SystemAdminRoot"),
);
const SystemOverview = lazy(
  () => import("./pages/admin/system/overview/SystemOverview"),
);
const SystemUserManagement = lazy(
  () => import("./pages/admin/system/users/UserManagement"),
);
const SystemActivityLog = lazy(
  () => import("./pages/admin/system/logs/ActivityLog"),
);
const SystemSettings = lazy(
  () => import("./pages/admin/system/settings/SystemSettings"),
);
const SystemHealth = lazy(
  () => import("./pages/admin/system/health/SystemHealth"),
);
const SystemSecurity = lazy(
  () => import("./pages/admin/system/security/SystemSecurity"),
);

const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserAnnouncements = lazy(() => import("./pages/user/UserAnnouncements"));
const UserModuleCatalog = lazy(() => import("./pages/user/UserModuleCatalog"));
const UserEnrolledModules = lazy(
  () => import("./pages/user/UserEnrolledModules"),
);
const ModuleViewer = lazy(() => import("./pages/user/ModuleViewer"));
const UserProfile = lazy(() => import("./pages/user/UserProfile"));
const UserSettings = lazy(() => import("./pages/user/UserSettings"));
const NotFoundPage = lazy(() => import("./pages/public/NotFoundPage"));
const MaintenancePage = lazy(() => import("./pages/public/MaintenancePage"));

const ModuleDetailsPage = lazy(
  () => import("./pages/user/ModuleDetailsPage"),
);
const BarangayAdminDashboard = lazy(
  () => import("./pages/admin/barangay/BarangayAdminDashboard"),
);
const MdrrmoAdminDashboard = lazy(
  () => import("./pages/admin/mdrrmo/MdrrmoAdminDashboard"),
);

const MdrrmoOverview = lazy(
  () => import("./pages/admin/mdrrmo/overview/Overview"),
);
const MdrrmoBarangayManagement = lazy(
  () => import("./pages/admin/mdrrmo/barangay-management/BarangayManagement"),
);
const MdrrmoModuleManagement = lazy(
  () => import("./pages/admin/mdrrmo/module-management/ModuleManagement"),
);
const MdrrmoUserManagement = lazy(
  () => import("./pages/admin/mdrrmo/user-management/UserManagement"),
);
const LiveAlerts = lazy(() => import("./pages/admin/mdrrmo/LiveAlerts"));

const BarangayWorkspaceOverview = lazy(
  () => import("./pages/admin/barangay/workspace/WorkspaceOverview"),
);
const BarangayResidentRegistry = lazy(
  () => import("./pages/admin/barangay/registry/ResidentRegistry"),
);
const BarangayCategoryConfig = lazy(
  () => import("./pages/admin/barangay/categories/CategoryConfig"),
);
const BarangaySystemLogs = lazy(
  () => import("./pages/admin/barangay/logs/SystemLogs"),
);
const BarangayActiveSyllabus = lazy(
  () => import("./pages/admin/barangay/syllabus/ActiveSyllabus"),
);

const CertificatePDF = lazy(
  () => import("./pages/user/certTemplate"),
);
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));
const UserLayout = lazy(() => import("./components/layouts/UserLayout"));
const AdminLayout = lazy(() => import("./components/layouts/AdminLayout"));
import ScrollToTop from "./components/ScrollToTop";
import GlobalBroadcastBanner from "./components/ui/GlobalBroadcastBanner";

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <GlobalBroadcastBanner />
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
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-white" aria-hidden="true">
            <div className="w-10 h-10 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          </div>
        }
      >
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  "system_admin",
                  "mdrrmo_admin",
                  "barangay_admin",
                ]}
              />
            }
          >
            <Route path="/admin/mfa-setup" element={<AdminMfaSetupPage />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email-prompt" element={<VerifyEmailPromptPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/maintenance" element={<MaintenancePage />} />

          <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
            <Route path="/user/modules/:moduleId" element={<ModuleViewer />} />
            <Route element={<UserLayout />}>
              <Route path="/userDashboard" element={<UserDashboard />} />
              <Route
                path="/user/announcements"
                element={<UserAnnouncements />}
              />
              <Route path="/user/modules" element={<UserModuleCatalog />} />
              <Route path="/user/enrolled" element={<UserEnrolledModules />} />
              <Route path="/user/profile" element={<UserProfile />} />
              <Route path="/user/settings" element={<UserSettings />} />
              <Route path="/user/modules/:id/details" element={<ModuleDetailsPage />} />
              <Route path="/user/certTemplate" element={<CertificatePDF />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["system_admin", "mdrrmo_admin", "barangay_admin"]} />}>
            <Route element={<AdminLayout />}>
              <Route element={<ProtectedRoute allowedRoles={["system_admin"]} />}>
                <Route
                  path="/admin/dashboard"
                  element={<Navigate to="/admin/system/dashboard" replace />}
                />
                <Route path="/admin/system" element={<SystemAdminRoot />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SystemOverview />} />
                  <Route path="users" element={<SystemUserManagement />} />
                  <Route path="logs" element={<SystemActivityLog />} />
                  <Route path="settings" element={<SystemSettings />} />
                  <Route path="health" element={<SystemHealth />} />
                  <Route path="security" element={<SystemSecurity />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRoles={["mdrrmo_admin"]} />}>
                <Route path="/admin/mdrrmo" element={<MdrrmoAdminDashboard />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<MdrrmoOverview />} />
                  <Route
                    path="barangay-management"
                    element={<MdrrmoBarangayManagement />}
                  />
                  <Route path="modules" element={<MdrrmoModuleManagement />} />
                  <Route path="users" element={<MdrrmoUserManagement />} />
                  <Route path="alerts" element={<LiveAlerts />} />
                  <Route
                    path="overview"
                    element={<Navigate to="dashboard" replace />}
                  />
                </Route>
              </Route>

              <Route
                element={<ProtectedRoute allowedRoles={["barangay_admin"]} />}
              >
                <Route
                  path="/admin/barangay"
                  element={<BarangayAdminDashboard />}
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route
                    path="dashboard"
                    element={<BarangayWorkspaceOverview />}
                  />
                  <Route path="registry" element={<BarangayResidentRegistry />} />
                  <Route path="residents" element={<BarangayResidentRegistry />} />
                  <Route path="categories" element={<BarangayCategoryConfig />} />
                  <Route path="logs" element={<BarangaySystemLogs />} />
                  <Route path="syllabus" element={<BarangayActiveSyllabus />} />
                  <Route
                    path="workspace"
                    element={<Navigate to="dashboard" replace />}
                  />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
