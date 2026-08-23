import { Link } from "react-router-dom";
import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";

import { useCertAnalytics } from "./hooks/useCertAnalytics";
import { useExpiringFeed } from "./hooks/useExpiringFeed";

import CertAnalyticsKPIs from "./components/CertAnalyticsKPIs";
import BarangayComplianceChart from "./components/BarangayComplianceChart";
import ModulePopularityChart from "./components/ModulePopularityChart";
import ExpiringCredentialsFeed from "./components/ExpiringCredentialsFeed";

export default function MdrrmoCertifications() {
  useDocumentTitle("Municipal Certification Analytics | MDRRMO Admin");

  const {
    data: analyticsData,
    isLoading: isAnalyticsLoading,
    refetch: refetchAnalytics,
    isFetching: isAnalyticsFetching,
  } = useCertAnalytics();

  const feedQuery = useExpiringFeed();

  const handleManualRefresh = () => {
    refetchAnalytics();
    feedQuery.refetch();
  };

  const isRefreshing = isAnalyticsFetching || feedQuery.isFetching;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 3-Level Breadcrumb Navigation (Matching MDRRMO convention) */}
      <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2">
          <li className="inline-flex items-center">
            <Link to="/admin/mdrrmo/dashboard" className="hover:text-red-600 transition-colors">
              Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span>Audited Sector Data</span>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2 text-gray-400">&gt;</span>
              <span className="text-gray-900 font-semibold">Certification Analytics</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Row (No icon next to H1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Municipal Certification Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Track disaster preparedness credentials, compliance rankings across 21 barangays, and expiring certifications
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-xs hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            className={`w-4 h-4 text-gray-500 ${isRefreshing ? "animate-spin" : ""}`}
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tier 1: 5 Standard KPI StatCards */}
      <CertAnalyticsKPIs
        summary={analyticsData?.summary}
        isLoading={isAnalyticsLoading}
      />

      {/* Tier 2: Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BarangayComplianceChart
            barangays={analyticsData?.barangays || []}
            isLoading={isAnalyticsLoading}
          />
        </div>
        <div className="lg:col-span-1">
          <ModulePopularityChart
            modules={analyticsData?.modules || []}
            isLoading={isAnalyticsLoading}
          />
        </div>
      </div>

      {/* Tier 3: Decoupled Expiring Credentials Action Feed */}
      <ExpiringCredentialsFeed
        feedQuery={feedQuery}
        modules={analyticsData?.modules || []}
      />
    </div>
  );
}
