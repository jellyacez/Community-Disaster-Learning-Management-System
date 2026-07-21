<<<<<<< HEAD
import React from "react";
import { Link } from "react-router-dom";
=======
>>>>>>> origin/main
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import useDocumentTitle from "../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Certificate01Icon,
  Award01Icon,
  Download01Icon,
  EyeIcon,
  Search01Icon,
  BookOpen01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

export default function UserCertificates() {
<<<<<<< HEAD
  useDocumentTitle("Certificates | Bacolor LMS");

  const { data: rawData, isLoading, isError } = useQuery({
=======
  const {
    data: rawData,
    isLoading,
    isError,
  } = useQuery({
>>>>>>> origin/main
    queryKey: ["userDashboardData"],
    queryFn: async () => {
      const response = await apiClient.get("/user/dashboard");
      return response.data;
    },
  });

<<<<<<< HEAD
  const certificates = rawData?.certificates || rawData?.data?.certificates || [];

  return (
    <div className="animate-in fade-in duration-300 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            My Certificates
          </h1>
          <p className="mt-1 text-sm text-gray-600 max-w-2xl">
            View and download official completion certificates for all the training modules you have satisfied. 
            Certificates are issued immediately after successfully meeting the required assessment criteria.
=======
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Error loading certificates. Please try again later.
      </div>
    );
  }

  const certificates =
    rawData?.certificates || rawData?.data?.certificates || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
          My Certificates
        </h1>
        <p className="text-gray-500 text-sm">
          View and download official completion certificates for all the
          training modules you have satisfied.
        </p>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <HugeiconsIcon
              icon={CheckmarkBadge01Icon}
              className="w-8 h-8 text-gray-400"
            />
          </div>
          <h3 className="text-lg font-bold text-gray-700">
            No Certificates Yet
          </h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            You haven't earned any certificates yet. Complete modules in the
            catalog to earn official certifications.
>>>>>>> origin/main
          </p>
        </div>
<<<<<<< HEAD

        {/* Top info cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={Certificate01Icon}
                className="w-5 h-5 text-red-600"
              />
              <h2 className="font-black text-gray-900">Per-Module Awards</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Every certificate belongs to a specific completed training module,
              not just to the user account in general.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={Award01Icon}
                className="w-5 h-5 text-amber-500"
              />
              <h2 className="font-black text-gray-900">Completion Basis</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Certificates become available after the learner completes the
              module and passes the required assessment or completion rules.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className="w-5 h-5 text-emerald-600"
              />
              <h2 className="font-black text-gray-900">Official Verification</h2>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your certificates are linked directly to backend records, allowing 
              for secure PDF generation and authentic QR verification.
            </p>
=======
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {certificates.map((cert) => (
              <div
                key={cert.verification_token}
                className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm flex flex-col"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                    {cert.cert_rec}
                  </span>
                  {cert.status === "expired" && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-[10px] rounded-full font-bold uppercase">
                      Expired
                    </span>
                  )}
                  {cert.status === "revoked" && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] rounded-full font-bold uppercase">
                      Revoked
                    </span>
                  )}
                </div>
                <h3
                  className={`font-bold text-sm mb-1 truncate ${cert.status === "revoked" ? "text-gray-400 line-through" : "text-gray-900"}`}
                  title={cert.module_title}
                >
                  {cert.module_title}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Earned: {new Date(cert.completion_date).toLocaleDateString()}
                </p>

                {cert.status === "revoked" ? (
                  <button
                    disabled
                    className="mt-auto w-full py-2 bg-gray-100 text-gray-400 text-sm font-bold rounded-lg text-center cursor-not-allowed"
                  >
                    Unavailable
                  </button>
                ) : (
                  <Link
                    to={`/user/certificates/view?token=${cert.verification_token}`}
                    className="mt-auto w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg text-center transition-colors"
                  >
                    View Certificate
                  </Link>
                )}
              </div>
            ))}
>>>>>>> origin/main
          </div>
        </div>

        {/* Main certificate panel */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <HugeiconsIcon
              icon={Certificate01Icon}
              className="w-5 h-5 text-red-600"
            />
            <h2 className="text-xl font-black text-gray-900">
              Earned Certificates
            </h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Official documents generated from your completed learning modules will be
            listed here.
          </p>

          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-100 p-5 animate-pulse"
                >
                  <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                  <div className="h-6 w-56 bg-gray-200 rounded mb-3" />
                  <div className="h-4 w-full bg-gray-100 rounded mb-2" />
                  <div className="h-4 w-4/5 bg-gray-100 rounded mb-5" />
                  <div className="flex gap-3">
                    <div className="h-10 w-32 bg-gray-100 rounded-xl" />
                    <div className="h-10 w-32 bg-gray-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
              <p className="font-bold text-red-700 mb-1">
                Failed to load certificates
              </p>
              <p className="text-sm text-red-600">
                We couldn&apos;t fetch your certificate records at this time. Please try again later.
              </p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
              <HugeiconsIcon
                icon={Search01Icon}
                className="w-12 h-12 text-gray-300 mx-auto mb-4"
              />
              <h3 className="text-2xl font-black text-gray-900 mb-2">
                No certificates yet
              </h3>
              <p className="text-gray-500 max-w-xl mx-auto mb-6">
                You have not yet earned any module certificates. Complete a
                training module and pass its required assessment to unlock your official certification.
              </p>
              <Link
                to="/user/modules"
                className="inline-flex items-center justify-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl transition-all duration-300"
              >
                Browse Modules
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {certificates.map((cert) => (
                <div
                  key={cert.verification_token || cert.cert_rec}
                  className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-red-50/30 shadow-sm p-6 flex flex-col"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                        <HugeiconsIcon
                          icon={Certificate01Icon}
                          className="w-3.5 h-3.5"
                        />
                        Certificate Ready
                      </span>
                      {cert.status === 'expired' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 ml-2 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase">
                          Expired
                        </span>
                      )}
                      {cert.status === 'revoked' && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 ml-2 rounded-full bg-gray-100 text-gray-800 text-xs font-bold uppercase">
                          Revoked
                        </span>
                      )}
                      <h3 className={`mt-3 text-xl font-black truncate ${cert.status === 'revoked' ? 'text-gray-400 line-through' : 'text-gray-900'}`} title={cert.module_title}>
                        {cert.module_title}
                      </h3>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl text-white flex items-center justify-center shadow-md shrink-0 ${cert.status === 'revoked' ? 'bg-gray-400' : 'bg-red-600'}`}>
                      <HugeiconsIcon
                        icon={Award01Icon}
                        className="w-7 h-7"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mb-5">
                    <div className="rounded-2xl bg-white border border-gray-100 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        Certificate ID
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {cert.cert_rec}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white border border-gray-100 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        Issued Date
                      </p>
                      <p className="text-sm font-bold text-gray-900">
                        {new Date(cert.completion_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-100 p-4 mb-5 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <HugeiconsIcon
                        icon={BookOpen01Icon}
                        className="w-4 h-4 text-gray-500"
                      />
                      <p className="text-sm font-bold text-gray-900">
                        Certificate Basis
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      This certificate represents successful completion of the
                      module <strong>{cert.module_title}</strong> and is verifiable via our official backend registry.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-auto">
                    {cert.status === 'revoked' ? (
                      <button
                        disabled
                        className="inline-flex flex-1 justify-center items-center gap-2 px-5 py-3 bg-gray-100 text-gray-400 text-sm font-bold rounded-2xl cursor-not-allowed"
                      >
                        Unavailable
                      </button>
                    ) : (
                      <>
                        <Link
                          to={`/user/certificates/view?token=${cert.verification_token}`}
                          className="inline-flex flex-1 justify-center items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-2xl transition-colors"
                        >
                          <HugeiconsIcon icon={EyeIcon} className="w-4 h-4" />
                          View Certificate
                        </Link>

                        <button
                          type="button"
                          className="inline-flex flex-1 justify-center items-center gap-2 px-5 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-2xl transition-colors"
                        >
                          <HugeiconsIcon
                            icon={Download01Icon}
                            className="w-4 h-4"
                          />
                          Download PDF
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
