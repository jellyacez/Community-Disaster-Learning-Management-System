import React from "react";
import { useNavigate } from "react-router-dom";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/auth/AuthLayout";
import TwoFactorSettings from "../../components/settings/TwoFactorSettings";
import { authClient } from "../../lib/auth-client";

export default function AdminMfaSetupPage() {
  useDocumentTitle("Admin MFA Setup | Bacolor LMS");
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleContinue = () => {
    if (session?.user?.twoFactorEnabled) {
      if (session.user.role === "system_admin") navigate("/admin/dashboard");
      else if (session.user.role === "mdrrmo_admin") navigate("/mdrrmo/dashboard");
      else if (session.user.role === "barangay_admin") navigate("/barangay/dashboard");
      else navigate("/userDashboard");
    } else {
      window.location.reload(); // Force reload to fetch latest session
    }
  };

  return (
    <AuthLayout title="Mandatory Security Setup" subtitle="Administrators must enable Two-Factor Authentication.">
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 text-sm font-semibold mb-6">
        Your role requires Multi-Factor Authentication (MFA) to access the dashboard. Please enable it below.
      </div>
      
      <div className="-mt-8">
        <TwoFactorSettings />
      </div>

      <button
        onClick={handleContinue}
        className="w-full mt-6 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
      >
        I have enabled MFA, Continue
      </button>
    </AuthLayout>
  );
}
