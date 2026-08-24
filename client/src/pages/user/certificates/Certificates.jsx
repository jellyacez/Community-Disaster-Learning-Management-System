import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../lib/apiClient";
import useDocumentTitle from "../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Certificate01Icon,
  InformationCircleIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import CertificateCard from "../../../components/ui/certificates/CertificateCard";
import { SkeletonBlock } from "../../../components/ui/Skeleton";

export default function UserCertificates() {
  useDocumentTitle("My Certificates | Bacolor LMS");
  const [infoDismissed, setInfoDismissed] = useState(false);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["userDashboard"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      return response.data;
    },
    refetchInterval: 30000, // Background polling every 30s
  });

  const certificates = useMemo(() => {
    return rawData?.certificates || rawData?.data?.certificates || [];
  }, [rawData]);

  const activeCount = useMemo(() => {
    return certificates.filter((c) => c.status === "active").length;
  }, [certificates]);

  return (
    <div className="animate-in fade-in duration-300 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Certificates</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Official completion credentials and disaster preparedness certifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && certificates.length > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-green-50 border border-green-200 rounded-full text-xs font-bold text-green-700">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-green-600" />
              <span>{activeCount} Active Credential{activeCount === 1 ? '' : 's'}</span>
            </div>
          )}
          <Link
            to="/user/modules"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm cursor-pointer"
          >
            <span>Earn Certifications</span>
          </Link>
        </div>
      </div>

      {/* Dismissible info banner */}
      {!infoDismissed && (
        <div className="flex items-start gap-3 bg-blue-50/80 border border-blue-100 rounded-2xl px-4 py-3 shadow-xs">
          <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800 leading-relaxed flex-1">
            Certificates are issued per module upon successful completion. Each credential includes a secure verification QR code recognized during community emergency response operations.
          </p>
          <button
            onClick={() => setInfoDismissed(true)}
            aria-label="Dismiss info"
            className="text-blue-400 hover:text-blue-600 cursor-pointer shrink-0"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Certificate List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <SkeletonBlock className="h-5 w-28 rounded-full" />
                <SkeletonBlock className="h-5 w-32 rounded-lg" />
              </div>
              <SkeletonBlock className="h-6 w-3/4 rounded-md" />
              <SkeletonBlock className="h-3.5 w-1/2 rounded-full" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
              <div className="flex gap-3 pt-2">
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="font-bold text-red-700 text-lg mb-1">Failed to load certificates</p>
          <p className="text-sm text-red-500">
            We couldn&apos;t fetch your certificate records at this time. Please check your connection or try again later.
          </p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
            <HugeiconsIcon icon={Certificate01Icon} className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">No Certificates Earned Yet</h3>
          <p className="text-gray-500 max-w-md mx-auto mb-6 text-sm">
            Complete training modules and pass their assessments to earn official MDRRMO-recognized disaster preparedness certificates.
          </p>
          <Link
            to="/user/modules"
            className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm"
          >
            Browse Module Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((cert) => (
            <CertificateCard
              key={cert.verification_token || cert.cert_rec}
              cert={cert}
            />
          ))}
        </div>
      )}
    </div>
  );
}
