
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import AuthLayout from "../../components/layouts/AuthLayout";
import RegisterForm from "../../components/auth/RegisterForm";

export default function RegisterPage() {
  useDocumentTitle("Register | Bacolor LMS");

  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  const [justRegistered, setJustRegistered] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem("isLoggingOut");
  }, []);

  useEffect(() => {
    if (session && !isPending) {
      const userRole = session.user?.role;
      const navState = justRegistered
        ? { state: { showWelcome: true }, replace: true }
        : { replace: true };

      if (userRole === "system_admin") navigate("/admin/dashboard", navState);
      else if (userRole === "mdrrmo_admin")
        navigate("/admin/mdrrmo/dashboard", navState);
      else if (userRole === "barangay_admin")
        navigate("/admin/barangay/dashboard", navState);
      else {
        // Check system status for residents
        apiClient.get("/user/dashboard").then(() => {
          navigate("/userDashboard", navState);
        }).catch(() => {
          // Global interceptor handles 503
        });
      }
    }
  }, [session, isPending, navigate, justRegistered]);

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Register to access the DRRM portal"
    >
      <RegisterForm />
    </AuthLayout>
  );
}
