import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert01Icon } from "@hugeicons/core-free-icons";
import PasswordInput from "../ui/inputs/PasswordInput";
import BarangayDropdown from "../ui/inputs/BarangayDropdown";
import TermsModal from "../ui/modals/TermsModal";
import PrivacyModal from "../ui/modals/PrivacyModal";
import ExplicitConsentModal from "../ui/modals/ExplicitConsentModal";
import Spinner from "../ui/Spinner";
import { useRegisterForm } from "./hooks/useRegisterForm";
import PasswordRequirements from "./PasswordRequirements";

export default function RegisterForm() {
  const { state, actions } = useRegisterForm();
  const { formData, errors, isSubmitting, showTermsModal, showPrivacyModal, showConsentModal } = state;

  return (
    <>
      <form onSubmit={actions.handleSubmit} noValidate className="space-y-4">
        {errors.form && (
          <div className="flex items-center justify-center gap-2 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold mb-4 border border-red-100">
            <HugeiconsIcon aria-hidden="true" icon={Alert01Icon} className="w-5 h-5 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <div>
          <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            name="fullName"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? "fullName-error" : undefined}
            value={formData.fullName}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            placeholder="e.g. Juan Dela Cruz"
            className={actions.getInputClass("fullName")}
            required
          />
          {errors.fullName && <p id="fullName-error" className="text-red-500 text-xs mt-1 font-medium">{errors.fullName}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            value={formData.email}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            placeholder="Example@email.com"
            className={actions.getInputClass("email")}
            required
          />
          {errors.email && <p id="email-error" className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
        </div>

        <BarangayDropdown 
          value={formData.barangay} 
          onChange={actions.handleChange} 
          onBlur={actions.handleBlur}
          error={errors.barangay} 
        />

        <div>
          <PasswordInput
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={actions.handleChange}
            onBlur={actions.handleBlur}
            error={errors.password}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
          />
          <PasswordRequirements password={formData.password} />
        </div>

        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm Password"
          value={formData.confirmPassword}
          onChange={actions.handleChange}
          onBlur={actions.handleBlur}
          error={errors.confirmPassword}
          placeholder="Re-enter your password"
          autoComplete="new-password"
        />

        <div className="text-xs text-gray-500 text-center mt-2 leading-relaxed">
          By clicking Create Account, you will be prompted to explicitly consent to our{" "}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); actions.setShowPrivacyModal(true); }}
            className="text-red-600 font-semibold hover:underline"
          >
            Privacy Policy
          </button>
          . You also acknowledge our{" "}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); actions.setShowTermsModal(true); }}
            className="text-red-600 font-semibold hover:underline"
          >
            Terms & Conditions
          </button>
          .
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-600/20 mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 text-gray-500" />
              Validating...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-sm text-gray-500 text-center mt-6">
        Already have an account?{" "}
        <Link to="/signin" className="text-red-600 font-semibold hover:underline">
          Sign In
        </Link>
      </p>

      <TermsModal isOpen={showTermsModal} onClose={() => actions.setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => actions.setShowPrivacyModal(false)} />
      
      <ExplicitConsentModal 
        isOpen={showConsentModal} 
        onCancel={() => actions.setShowConsentModal(false)}
        onConfirm={actions.confirmRegistration}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
