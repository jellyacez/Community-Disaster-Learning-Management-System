import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../lib/apiClient";
import { Link } from "react-router-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";

export default function UserCertificates() {
  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ["userDashboardData"],
    queryFn: async () => {
      const response = await apiClient.get('/user/dashboard');
      return response.data;
    },
  });

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

  const certificates = rawData?.certificates || rawData?.data?.certificates || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">My Certificates</h1>
        <p className="text-gray-500 text-sm">
          View and download official completion certificates for all the training modules you have satisfied.
        </p>
      </div>
      
      {certificates.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-12 text-center border border-gray-200 shadow-sm">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
            <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-700">No Certificates Yet</h3>
          <p className="text-gray-500 mt-2 max-w-md mx-auto">
            You haven't earned any certificates yet. Complete modules in the catalog to earn official certifications.
          </p>
          <Link
            to="/user/modules"
            className="mt-6 inline-block px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            Browse Modules
          </Link>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {certificates.map(cert => (
              <div key={cert.verification_token} className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{cert.cert_rec}</span>
                  {cert.status === 'expired' && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-[10px] rounded-full font-bold uppercase">Expired</span>
                  )}
                  {cert.status === 'revoked' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] rounded-full font-bold uppercase">Revoked</span>
                  )}
                </div>
                <h3 className={`font-bold text-sm mb-1 truncate ${cert.status === 'revoked' ? 'text-gray-400 line-through' : 'text-gray-900'}`} title={cert.module_title}>
                   {cert.module_title}
                </h3>
                <p className="text-xs text-gray-500 mb-4">Earned: {new Date(cert.completion_date).toLocaleDateString()}</p>
                
                {cert.status === 'revoked' ? (
                  <button disabled className="mt-auto w-full py-2 bg-gray-100 text-gray-400 text-sm font-bold rounded-lg text-center cursor-not-allowed">
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
          </div>
        </div>
      )}
    </div>
  );
}
