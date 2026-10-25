// --- START: SignInPage.jsx ---
import { useState, useEffect } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/layouts/AuthLayout";
import EmailSignInForm from "../../components/auth/EmailSignInForm";
import MfaSignInForm from "../../components/auth/MfaSignInForm";

// "juan.delacruz@gmail.com" -> "j***@gmail.com", enough to recognise the inbox without exposing it
const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return "";
  return `${name[0]}***@${domain}`;
};

export default function SignInPage() {
  useDocumentTitle("Sign In | Bacolor Disaster LMS");

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

  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();
  const [signedOutAll, setSignedOutAll] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [twoFactorMethods, setTwoFactorMethods] = useState([]);
  const [twoFactorCurrentMethod, setTwoFactorCurrentMethod] = useState("");
  const [otpAutoSent, setOtpAutoSent] = useState(false);
  const [otpSendFailed, setOtpSendFailed] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("showLogoutModal") === "true") {
      setTimeout(() => setSignedOutAll(true), 0);
      sessionStorage.removeItem("showLogoutModal");
    }

    if (sessionStorage.getItem("isLoggingOut") === "true") {
      if (!session && !isPending) {
        sessionStorage.removeItem("isLoggingOut");
        localStorage.removeItem("bacolor_theme");
        document.documentElement.classList.remove("dark");
      }
      return;
    }

    if (session && !isPending) {
      const userRole = session.user?.role;
      const isAdmin = [
        "system_admin",
        "head_mdrrmo_admin",
        "mdrrmo_admin",
        "barangay_admin",
      ].includes(userRole);
      const mfaBypass = import.meta.env.VITE_DISABLE_MFA === "true";

      if (isAdmin && !session.user.twoFactorEnabled && !mfaBypass) {
        navigate("/admin/mfa-setup", { replace: true });
        return;
      }

      const roleRoutes = {
        system_admin: "/admin/dashboard",
        head_mdrrmo_admin: "/admin/mdrrmo/dashboard",
        mdrrmo_admin: "/admin/mdrrmo/dashboard",
        barangay_admin: "/admin/barangay/dashboard",
        resident: "/userDashboard",
      };

      const targetRoute = roleRoutes[userRole] || "/userDashboard";

      // Only system_admin can enter the system during maintenance mode
      if (userRole === "system_admin") {
        navigate(targetRoute, { replace: true });
        return;
      }

      // Every other role checks if maintenance mode is active before entering
      apiClient
        .get("/public/status")
        .then(() => {
          navigate(targetRoute, {
            replace: true,
            state: targetRoute === "/userDashboard" ? { fromLogin: true } : {},
          });
        })
        .catch((err) => {
          if (err.response?.status === 503) {
            navigate("/maintenance", { replace: true });
          } else if (err.response?.status === 401) {
            authClient.signOut();
          } else {
            navigate(targetRoute, {
              replace: true,
              state:
                targetRoute === "/userDashboard" ? { fromLogin: true } : {},
            });
          }
        });
    }
  }, [session, isPending, navigate]);

  const handleRequireMfa = async (data) => {
    const methods = data.twoFactorMethods || [];
    setTwoFactorMethods(methods);
    setMfaEmail(data.email || "");
    if (methods.includes("totp")) {
      setTwoFactorCurrentMethod("totp");
    } else if (methods.includes("otp")) {
      setTwoFactorCurrentMethod("otp");
      // Email-only staff get their code straight away instead of tapping "Send" first
      const { error } = await authClient.twoFactor.sendOtp();
      // The code step shows the outcome itself, so no toast either way
      setOtpAutoSent(!error);
      setOtpSendFailed(!!error);
    }
    setShowTwoFactor(true);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["session"] });
    queryClient.invalidateQueries({ queryKey: ["userDashboard"] });
    queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    toast.success("Signed in");
  };

  if (showTwoFactor) {
    return (
      <AuthLayout
        title="Verification Code"
        subtitle={
          twoFactorCurrentMethod === "totp"
            ? "Enter the code from your authenticator app."
            : otpAutoSent && mfaEmail
              ? `We sent a 6-digit code to ${maskEmail(mfaEmail)}.`
              : "We'll email you a 6-digit code."
        }
      >
        <MfaSignInForm
          twoFactorMethods={twoFactorMethods}
          initialMethod={twoFactorCurrentMethod}
          onMethodChange={setTwoFactorCurrentMethod}
          otpAlreadySent={otpAutoSent}
          otpSendFailed={otpSendFailed}
          onCodeSent={() => {
            setOtpAutoSent(true);
            setOtpSendFailed(false);
          }}
          onCancel={() => setShowTwoFactor(false)}
          onSuccess={handleSuccess}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Access your Bacolor Disaster LMS account. Barangay and MDRRMO staff will also enter a verification code."
    >
      {signedOutAll && (
        <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-800">
          <HugeiconsIcon aria-hidden="true" icon={CheckmarkCircle02Icon} className="h-5 w-5 shrink-0" />
          <span>You signed out of all devices. Sign in again to continue.</span>
        </div>
      )}

      <EmailSignInForm
        initialEmail={mfaEmail}
        errorMessage={errorMessage}
        clearGlobalError={clearGlobalError}
        onRequireMfa={handleRequireMfa}
        onSuccess={handleSuccess}
      />

      <p className="text-sm text-gray-600 text-center mt-6">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="inline-flex min-h-11 items-center text-gray-900 font-semibold underline underline-offset-4 hover:text-gray-600 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          Register
        </Link>
      </p>

      <p className="text-sm text-gray-600 text-center">
        Need help signing in? Contact the MDRRMO at{" "}
        <a
          href="mailto:mdrrmcbacolor@gmail.com"
          className="inline-flex min-h-11 items-center whitespace-nowrap font-semibold text-gray-900 underline underline-offset-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          mdrrmcbacolor@gmail.com
        </a>
      </p>

    </AuthLayout>
  );
}
// --- END: SignInPage.jsx ---
