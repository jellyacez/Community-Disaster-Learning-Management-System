// --- START: SignInPage.jsx ---
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/layouts/AuthLayout";
import ConfirmationModal from "../../components/ui/modals/ConfirmationModal";
import EmailSignInForm from "../../components/auth/EmailSignInForm";
import MfaSignInForm from "../../components/auth/MfaSignInForm";

export default function SignInPage() {
  useDocumentTitle("Sign In | Bacolor LMS");

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlError = searchParams.get("error");
  
  let errorMessage = location.state?.error;
  if (!errorMessage && urlError) {
    if (urlError === "access_denied") {
      errorMessage = "Google sign-in was cancelled.";
    } else {
      errorMessage = "Authentication failed. Please try again.";
    }
  }

  const clearGlobalError = () => {
    let cleared = false;
    if (urlError) {
      searchParams.delete("error");
      setSearchParams(searchParams, { replace: true });
      cleared = true;
    }
    if (location.state?.error) {
      navigate(location.pathname, { replace: true, state: {} });
      cleared = true;
    }
    return cleared;
  };

  const { data: session, isPending } = authClient.useSession();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] = useState([]);
  const [twoFactorCurrentMethod, setTwoFactorCurrentMethod] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("showLogoutModal") === "true") {
      setTimeout(() => setShowLogoutModal(true), 0);
      sessionStorage.removeItem("showLogoutModal");
    }

    if (sessionStorage.getItem("isLoggingOut") === "true") {
      if (!session && !isPending) {
        sessionStorage.removeItem("isLoggingOut");
      }
      return;
    }

    if (session && !isPending) {
      const userRole = session.user?.role;
      const isAdmin = ["system_admin", "mdrrmo_admin", "barangay_admin"].includes(userRole);
      const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";

      if (isAdmin && !session.user.twoFactorEnabled && !mfaBypass) {
        navigate("/admin/mfa-setup", { replace: true });
        return;
      }

      const roleRoutes = {
        system_admin: "/admin/dashboard",
        mdrrmo_admin: "/admin/mdrrmo/dashboard",
        barangay_admin: "/admin/barangay/dashboard",
        resident: "/userDashboard"
      };
      
      const targetRoute = roleRoutes[userRole] || "/userDashboard";
      
      if (userRole === "resident") {
        // Verify system status before routing resident
        apiClient.get("/user/dashboard").then(() => {
          navigate(targetRoute, { replace: true });
        }).catch(() => {
          // Let global interceptor handle 503
        });
      } else {
        navigate(targetRoute, { replace: true });
      }
    }
  }, [session, isPending, navigate]);

  const handleRequireMfa = (data) => {
    const methods = data.twoFactorMethods || [];
    setTwoFactorMethods(methods);
    if (methods.includes("totp")) {
      setTwoFactorCurrentMethod("totp");
    } else if (methods.includes("otp")) {
      setTwoFactorCurrentMethod("otp");
    }
    setShowTwoFactor(true);
  };

  const handleSuccess = () => {
    toast.success("Successfully logged in!");
  };

  if (showTwoFactor) {
    return (
      <AuthLayout 
        title="Two-Factor Authentication" 
        subtitle={twoFactorCurrentMethod === "totp" ? "Enter the code from your authenticator app" : "Enter the verification code sent to your email"}
      >
        <MfaSignInForm 
          twoFactorMethods={twoFactorMethods}
          initialMethod={twoFactorCurrentMethod}
          onCancel={() => setShowTwoFactor(false)}
          onSuccess={handleSuccess}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Sign In" subtitle="Access your DRRM training account">
      <EmailSignInForm 
        errorMessage={errorMessage}
        clearGlobalError={clearGlobalError}
        onRequireMfa={handleRequireMfa}
        onSuccess={handleSuccess}
      />

      <p className="text-sm text-gray-500 text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="text-red-600 font-semibold hover:underline"
        >
          Register
        </Link>
      </p>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => setShowLogoutModal(false)}
        title="You have been logged out."
        description="You have been logged out from another device. If this wasn't you, we recommend changing your password immediately to secure your account."
        type="success"
        confirmText="Okay"
        cancelText="Close"
      />
    </AuthLayout>
  );
}
// --- END: SignInPage.jsx ---
