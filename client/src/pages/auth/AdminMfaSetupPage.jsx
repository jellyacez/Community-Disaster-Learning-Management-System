// --- START: AdminMfaSetupPage.jsx ---
import { useNavigate } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/layouts/AuthLayout";
import TwoFactorSettings from "../../components/settings/TwoFactorSettings";
import { authClient } from "../../lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminMfaSetupPage() {
  useDocumentTitle("Admin MFA Setup | Bacolor LMS");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const isMfaEnabled = session?.user?.twoFactorEnabled;

  const handleContinue = () => {
    if (session?.user?.twoFactorEnabled) {
      if (session.user.role === "system_admin") {
        navigate("/admin/system", { replace: true });
      } else if (session.user.role === "mdrrmo_admin") {
        navigate("/admin/mdrrmo", { replace: true });
      } else if (session.user.role === "barangay_admin") {
        navigate("/admin/barangay", { replace: true });
      }
    } else {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  };

  const handleSignOut = async () => {
    sessionStorage.setItem("isLoggingOut", "true");
    await authClient.signOut();
    navigate("/", { replace: true });
  };

  return (
    <AuthLayout 
      title="Mandatory Security Setup" 
      subtitle="Administrators must enable Two-Factor Authentication."
      backText="Sign Out"
      onBackClick={handleSignOut}
    >
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-semibold mb-6">
        Your role requires Multi-Factor Authentication (MFA) to access the dashboard. Please enable it below.
      </div>
      
      <div>
        {/* Component contains the actual QR generation and verification logic */}
        <TwoFactorSettings />
      </div>

      <button
        onClick={handleContinue}
        disabled={!isMfaEnabled}
        className={`w-full mt-6 py-3 rounded-xl font-bold transition-colors ${
          isMfaEnabled
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        I have enabled MFA, Continue
      </button>
    </AuthLayout>
  );
}
// --- END: AdminMfaSetupPage.jsx ---
