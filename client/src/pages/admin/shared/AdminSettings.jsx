import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircle02Icon,
  Mail01Icon,
  Location01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";

import { authClient } from "../../../lib/auth-client";
import apiClient from "../../../lib/apiClient";
import useDocumentTitle from "../../../hooks/useDocumentTitle";

import { preparePersonName } from "../../../utils/personName";

import { useMfaEnabled } from "../../../hooks/useMfaEnabled";


import SecuritySettings from "../../../components/settings/SecuritySettings";
import ActiveDevices from "../../../components/settings/ActiveDevices";
import LoginHistory from "../../../components/settings/LoginHistory";


function AdminAccountPreferences({ session }) {
  const queryClient = useQueryClient();
  const user = session?.user;
  // Existing full names cannot reliably be split into name components.
  const namesFromUser = () => ({
    first_name: user?.first_name || "",
    middle_name: user?.middle_name || "",
    last_name: user?.last_name || "",
  });
  const [names, setNames] = useState(namesFromUser);
  const [errors, setErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  const userRole = user?.role || "admin";
  const isBarangayAdmin = userRole === "barangay_admin";

  // Reload the fields when the user or their saved name changes (adjusted during render, not in an effect)
  const userNameKey = [user?.id, user?.first_name, user?.middle_name, user?.last_name].join("\u0000");
  const [loadedNameKey, setLoadedNameKey] = useState(userNameKey);
  if (userNameKey !== loadedNameKey) {
    setLoadedNameKey(userNameKey);
    setNames(namesFromUser());
    setErrors({});
  }

  const { data: barangays = [] } = useQuery({
    queryKey: ["publicBarangaysList"],
    queryFn: async () => {
      const res = await apiClient.get("/public/barangays");
      return res.data || [];
    },
    enabled: isBarangayAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const getJurisdictionLabel = () => {
    if (isBarangayAdmin) {
      if (user?.barangay_id && barangays.length > 0) {
        const found = barangays.find((b) => b.id === user.barangay_id);
        if (found) {
          return found.name.toLowerCase().startsWith("barangay")
            ? found.name
            : `Barangay ${found.name}`;
        }
      }
      return user?.barangay_id ? `Barangay #${user.barangay_id}` : "Assigned Barangay";
    }
    return "Municipality of Bacolor (MDRRMO HQ)";
  };

  const handleUpdateProfile = async (event) => {
    event.preventDefault();
    if (isUpdating || !user?.id) return;

    const { errors: nextErrors, data } = preparePersonName(names);
    setErrors(nextErrors);
    if (!data) {
      document.getElementById(`admin-${Object.keys(nextErrors)[0]}`)?.focus();
      return;
    }

    const fields = ["first_name", "middle_name", "last_name"];
    if (fields.every((field) => data[field] === (user[field] || ""))) {
      toast("No name changes to save.");
      return;
    }

    setIsUpdating(true);
    try {
      // Sends all components plus the display name. The backend rebuilds name.
      const { error } = await authClient.updateUser(data);
      if (error) {
        toast.error(error.message || "Failed to update profile.");
        return;
      }

      setNames({
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
      });
      queryClient.setQueryData(["session"], (previous) =>
        previous?.user && String(previous.user.id) === String(user.id)
          ? { ...previous, user: { ...previous.user, ...data } }
          : previous,
      );
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile. Check your connection and try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleUpdateProfile} noValidate className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <HugeiconsIcon icon={UserCircle02Icon} className="w-5 h-5 text-red-500" />
            <span>Your name</span>
          </h4>
          <p id="admin-name-help" className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Your display name is built from these fields. Numbers are not allowed.
            Leave middle name blank if you do not have one.
          </p>
          {!(user?.first_name && user?.last_name) && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
              Current name: <strong className="break-words">{user?.name || "Not provided"}</strong>.
              Enter your name in the separate fields. Your current name stays unchanged until you save.
            </p>
          )}
        </div>
        <div className="w-full min-w-0 md:w-2/3 max-w-md space-y-4">
          {[
            { key: "first_name", label: "First name", autoComplete: "given-name" },
            { key: "middle_name", label: "Middle name (optional)", autoComplete: "additional-name" },
            { key: "last_name", label: "Last name", autoComplete: "family-name" },
          ].map((field) => (
            <div key={field.key}>
              <label htmlFor={`admin-${field.key}`} className="mb-1 block text-sm font-semibold text-gray-700 dark:text-slate-200">
                {field.label}
              </label>
              <input
                id={`admin-${field.key}`} name={field.key} type="text"
                autoComplete={field.autoComplete} value={names[field.key]}
                disabled={isUpdating} required={field.key !== "middle_name"} maxLength={100}
                aria-invalid={Boolean(errors[field.key])}
                aria-describedby={errors[field.key] ? `admin-${field.key}-error` : "admin-name-help"}
                onChange={(event) => {
                  setNames((previous) => ({ ...previous, [field.key]: event.target.value }));
                  setErrors((previous) => ({ ...previous, [field.key]: undefined }));
                }}
                className={`min-h-11 w-full rounded-xl border bg-white dark:bg-slate-800/80 text-gray-900 dark:text-white px-4 py-3 outline-none focus:ring-2 focus:ring-red-500/20 transition-colors disabled:opacity-60 ${
                  errors[field.key] ? "border-red-600" : "border-gray-200 dark:border-slate-700 focus:border-red-500"
                }`}
              />
              {errors[field.key] && (
                <p id={`admin-${field.key}-error`} role="alert" className="mt-1 text-xs text-red-700 dark:text-red-300">
                  {errors[field.key]}
                </p>
              )}
            </div>
          ))}
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Display name: <span className="break-words font-semibold text-gray-900 dark:text-white">
              {preparePersonName(names).data?.name || user?.name || "Complete the fields above"}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="adminEmail">Email Address</label>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider ml-1">
              Uneditable
            </span>
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Administrative email managed through system provisioning.
          </p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <input
            id="adminEmail"
            type="email"
            value={user?.email || ""}
            disabled
            readOnly
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700/60 px-4 py-3 bg-gray-50 dark:bg-slate-800/40 text-gray-500 dark:text-slate-400 cursor-not-allowed outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <HugeiconsIcon icon={Location01Icon} className="w-5 h-5 text-red-500" />
            <span>Jurisdiction</span>
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {isBarangayAdmin
              ? "Your assigned barangay community sector."
              : "Municipality-wide DRRMO oversight authority."}
          </p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <input
            type="text"
            value={getJurisdictionLabel()}
            disabled
            readOnly
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700/60 px-4 py-3 bg-gray-50 dark:bg-slate-800/40 text-gray-600 dark:text-slate-300 font-medium cursor-not-allowed outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 md:gap-16 pt-2">
        <div className="md:w-1/3 shrink-0"></div>
        <div className="md:w-2/3 max-w-md flex justify-end">
          <button
            type="submit"
            disabled={isUpdating || !user?.id}
            className={`flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors active:scale-95 ${
              isUpdating ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 cursor-pointer"
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </form>
  );
}

function AdminTwoFactorStatus({ session }) {
  const isEnabled = session?.user?.twoFactorEnabled;

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 text-red-500" />
            <span>Two-Factor Auth</span>
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Mandatory multi-factor authentication policy for administrative personnel.
          </p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <div className="flex items-center justify-between p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                <HugeiconsIcon icon={Shield01Icon} className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  {isEnabled ? "Enforced & Active" : "Policy Enforced"}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Authenticator App (TOTP) is required for portal access.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 dark:bg-emerald-900/60 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Required
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  useDocumentTitle("Settings | DRRM Portal");
  const { data: session } = authClient.useSession();
  const mfaEnabled = useMfaEnabled();

  return (
    <div className="animate-in fade-in duration-300 w-full pb-12 transition-colors">
      <div className="mb-8 px-1">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Account Settings
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Manage your administrative profile, security credentials, and active device sessions.
        </p>
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4 px-1">
            Account Preferences
          </h2>
          <div className="rounded-3xl border border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800/80 transition-colors">
            <AdminAccountPreferences session={session} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4 px-1">
            Security & Activity
          </h2>
          <div className="rounded-3xl border border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800/80 transition-colors">
            <SecuritySettings />
            {mfaEnabled && <AdminTwoFactorStatus session={session} />}
            <ActiveDevices />
            <LoginHistory />
          </div>
        </section>

      </div>
    </div>
  );
}
