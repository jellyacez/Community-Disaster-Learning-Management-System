import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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

import SecuritySettings from "../../../components/settings/SecuritySettings";
import ActiveDevices from "../../../components/settings/ActiveDevices";
import LoginHistory from "../../../components/settings/LoginHistory";


function AdminAccountPreferences({ session }) {
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const user = session?.user;
  const userRole = user?.role || "admin";
  const isBarangayAdmin = userRole === "barangay_admin";

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return toast.error("Display name cannot be empty.");
    }
    if (trimmed === user?.name) {
      return toast.error("No changes made to display name.");
    }

    setIsUpdating(true);
    try {
      const { error } = await authClient.updateUser({ name: trimmed });
      if (error) {
        toast.error(error.message || "Failed to update profile.");
      } else {
        toast.success("Profile updated successfully!");
      }
    } catch (err) {
      console.error("Failed to update admin profile:", err);
      toast.error("Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-6 md:p-8 w-full flex flex-col space-y-2">
      {/* Display Name Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors group">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <HugeiconsIcon icon={UserCircle02Icon} className="w-5 h-5 text-red-500" />
            <label htmlFor="adminDisplayName">Display Name</label>
          </h4>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            This is your administrative display name on the portal.
          </p>
        </div>
        <div className="md:w-2/3 max-w-md">
          <input
            id="adminDisplayName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-gray-900 dark:text-white px-4 py-3 outline-none focus:border-red-400 transition-colors"
          />
        </div>
      </div>

      {/* Email Row */}
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

      {/* Jurisdiction Row */}
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

      {/* Save Button Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 pt-2">
        <div className="md:w-1/3 shrink-0"></div>
        <div className="md:w-2/3 max-w-md flex justify-end">
          <button
            onClick={handleUpdateProfile}
            disabled={isUpdating}
            className={`flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-bold text-white transition-colors active:scale-95 ${
              isUpdating ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
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
        {/* Group 1: Account Preferences */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4 px-1">
            Account Preferences
          </h2>
          <div className="rounded-3xl border border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800/80 transition-colors">
            <AdminAccountPreferences session={session} />
          </div>
        </section>

        {/* Group 2: Security & Activity */}
        <section>
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-200 uppercase tracking-wider mb-4 px-1">
            Security & Activity
          </h2>
          <div className="rounded-3xl border border-gray-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-slate-800/80 transition-colors">
            <SecuritySettings />
            <AdminTwoFactorStatus session={session} />
            <ActiveDevices />
            <LoginHistory />
          </div>
        </section>

      </div>
    </div>
  );
}
