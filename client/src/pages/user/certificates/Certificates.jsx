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
    refetchInterval: 60000,
  });

  const certificates = useMemo(() => {
    return rawData?.certificates || rawData?.data?.certificates || [];
  }, [rawData]);

  const activeCount = useMemo(() => {
    return certificates.filter((c) => c.status === "active").length;
  }, [certificates]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* Page Header (Open layout matching 'Enrolled Modules') */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
            My Certificates
          </h1>
          <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
            Official completion credentials and disaster preparedness certifications.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isLoading && certificates.length > 0 && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-2xs">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{activeCount} Active Credential{activeCount === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dismissible Notice (Edge-to-edge with matching radius) */}
      {!infoDismissed && (
        <div className="flex items-center gap-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-2xl px-5 py-3.5 shadow-2xs">
          <HugeiconsIcon icon={InformationCircleIcon} className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 flex-1 font-medium leading-relaxed">
            Certificates are issued per module upon successful completion. Each credential includes a secure verification QR code recognized during community emergency response operations.
          </p>
          <button
            type="button"
            onClick={() => setInfoDismissed(true)}
            aria-label="Dismiss info"
            className="text-blue-400 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-200 cursor-pointer shrink-0 p-1"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2-Column Full-Width Grid Matching Reference */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs animate-pulse space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-slate-800">
                <SkeletonBlock className="h-5 w-28 rounded-full" />
                <SkeletonBlock className="h-5 w-32 rounded-lg" />
              </div>
              <SkeletonBlock className="h-6 w-3/4 rounded-md" />
              <SkeletonBlock className="h-4 w-1/2 rounded-full" />
              <SkeletonBlock className="h-14 w-full rounded-xl" />
              <div className="flex gap-3 pt-2">
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
                <SkeletonBlock className="h-10 flex-1 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-8 text-center">
          <p className="font-bold text-red-700 dark:text-red-300 text-base mb-1">Failed to load certificates</p>
          <p className="text-sm text-red-500 dark:text-red-400 max-w-md mx-auto">
            We couldn&apos;t fetch your certificate records at this time. Please check your connection or try again later.
          </p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-xs">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-950/40 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-red-600 dark:text-red-400">
            <HugeiconsIcon icon={Certificate01Icon} className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">
            No Certificates Earned Yet
          </h3>
          <p className="text-gray-500 dark:text-slate-400 max-w-sm mx-auto mb-5 text-sm leading-relaxed">
            Complete training modules and pass their assessments to earn official MDRRMO-recognized disaster preparedness certificates.
          </p>
          <Link
            to="/user/modules"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl text-sm transition-all shadow-xs"
          >
            Browse Module Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 w-full">
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
