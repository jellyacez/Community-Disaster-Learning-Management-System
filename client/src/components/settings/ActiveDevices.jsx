import React, { useState, useEffect } from "react";
import { authClient } from "../../lib/auth-client";
import toast from "react-hot-toast";
import ConfirmationModal from "../ui/modals/ConfirmationModal";
import ActiveDeviceItem from "./ActiveDeviceItem";
import { HugeiconsIcon } from "@hugeicons/react";
import { LaptopIcon, SmartPhone01Icon } from "@hugeicons/core-free-icons";

export default function ActiveDevices() {
  const { data: activeSession } = authClient.useSession();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await authClient.listSessions();
      if (data) setSessions(data);
      setLoading(false);
    };
    fetchSessions();
  }, [activeSession]);

  const handleConfirmRevoke = React.useCallback(async () => {
    setIsRevoking(true);

    if (revokeTarget === "ALL") {
      await authClient.revokeOtherSessions();
      sessionStorage.setItem("isLoggingOut", "true");
      sessionStorage.setItem("showLogoutModal", "true");
      await authClient.signOut();
      return;
    }

    const targetSession = sessions.find(s => s.token === revokeTarget);
    const isCurrentSession = targetSession?.id === activeSession?.session?.id;
    
    if (isCurrentSession) {
      sessionStorage.setItem("isLoggingOut", "true");
      sessionStorage.setItem("showLogoutModal", "true");
    }

    const { error } = await authClient.revokeSession({ token: revokeTarget });
    setIsRevoking(false);
    setIsModalOpen(false);

    if (error) {
      toast.error("Failed to revoke session");
    } else {
      if (isCurrentSession) {
      } else {
        setSessions((prev) => prev.filter((s) => s.token !== revokeTarget));
        toast.success("Device signed out successfully!");
      }
    }
  }, [revokeTarget, sessions, activeSession]);

  const initiateRevoke = React.useCallback((target) => {
    setRevokeTarget(target);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const getDeviceDetails = (ua) => {
    if (!ua) return { name: "Unknown Device", icon: LaptopIcon };
    if (
      ua.includes("Mobi") ||
      ua.includes("Android") ||
      ua.includes("iPhone")
    ) {
      return { name: "Mobile Device", icon: SmartPhone01Icon };
    }
    if (ua.includes("Windows")) return { name: "Windows PC", icon: LaptopIcon };
    if (ua.includes("Mac")) return { name: "Mac", icon: LaptopIcon };
    return { name: "Desktop", icon: LaptopIcon };
  };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-sm h-fit">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2.5 rounded-xl text-red-600 flex-shrink-0">
            <HugeiconsIcon aria-hidden="true" icon={LaptopIcon} className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Active Devices
            </h2>
            <p className="text-sm text-gray-500">
              These are the devices currently logged into your account.
            </p>
          </div>
        </div>
        {sessions.length > 1 && (
          <button
            onClick={() => initiateRevoke("ALL")}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 transition whitespace-nowrap"
          >
            Sign Out All
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading devices...</p>
      ) : (
        <div className="flex flex-col">
          {sessions.map((session) => (
              <ActiveDeviceItem
                key={session.id || session.token}
                session={session}
                isCurrent={
                  activeSession?.session?.id === session.id || 
                  (activeSession?.session?.token && activeSession?.session?.token === session.token) ||
                  (activeSession?.session?.userAgent === session.userAgent && activeSession?.session?.ipAddress === session.ipAddress)
                }
                onSignOut={initiateRevoke}
                isOnlySession={sessions.length === 1}
              />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmRevoke}
        title={
          revokeTarget === "ALL" ? "Sign Out All Devices?" : "Sign Out Device?"
        }
        description={
          revokeTarget === "ALL"
            ? "Are you sure you want to sign out from ALL active devices? You will be required to log in again immediately."
            : "Are you sure you want to sign out this device? It will require logging in again to access the account from that device."
        }
        type="danger"
        confirmText={revokeTarget === "ALL" ? "Sign Out All" : "Sign Out"}
        cancelText="Cancel"
        isLoading={isRevoking}
      />
    </div>
  );
}
