import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Certificate01Icon,
  Search01Icon,
  InformationCircleIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import CertificateCard from "../../components/ui/certificates/CertificateCard";

export default function UserCertificates() {
  useDocumentTitle("Certificates | Bacolor LMS");
  const [infoDismissed, setInfoDismissed] = useState(false);

  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["userDashboardData"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      return response.data;
    },
  });

  const certificates = rawData?.certificates || rawData?.data?.certificates || [];

  return (
    <div className="animate-in fade-in duration-300">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">My Certificates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Official completion certificates for your earned training modules.
            </p>
          </div>
          {!isLoading && certificates.length > 0 && (
            <div className="shrink-0 flex items-center gap-2 mt-1 px-3 py-1.5 bg-red-50 border border-red-100 rounded-full">
              <HugeiconsIcon icon={Certificate01Icon} className="w-4 h-4 text-red-600" />
              <span className="text-sm font-bold text-red-700">{certificates.length} earned</span>
            </div>
          )}
        </div>

        {/* Dismissible info banner */}
        {!infoDismissed && (
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
            <HugeiconsIcon icon={InformationCircleIcon} className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 leading-relaxed flex-1">
              Certificates are issued per module upon successful completion. Each one is linked to a backend record and can be verified via QR code.
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

        {/* Certificate list */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="rounded-2xl border border-gray-100 p-4 animate-pulse">
                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                <div className="h-5 w-48 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-100 rounded mb-4" />
                <div className="flex gap-2">
                  <div className="h-9 flex-1 bg-gray-100 rounded-xl" />
                  <div className="h-9 flex-1 bg-gray-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
            <p className="font-bold text-red-700 mb-1">Failed to load certificates</p>
            <p className="text-sm text-red-500">
              We couldn&apos;t fetch your certificate records at this time. Please try again later.
            </p>
          </div>
        ) : certificates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
            <HugeiconsIcon icon={Search01Icon} className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 mb-2">No certificates yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
              Complete a training module and pass its assessment to earn your first official certificate.
            </p>
            <Link
              to="/user/modules"
              className="inline-flex items-center justify-center px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-sm transition-all duration-200"
            >
              Browse Modules
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((cert) => (
              <CertificateCard
                key={cert.verification_token || cert.cert_rec}
                cert={cert}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
