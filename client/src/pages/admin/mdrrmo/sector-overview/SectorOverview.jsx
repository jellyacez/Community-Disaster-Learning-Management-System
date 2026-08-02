import useDocumentTitle from "../../../../hooks/useDocumentTitle";
import { HugeiconsIcon } from "@hugeicons/react";
import { ConstructionIcon } from "@hugeicons/core-free-icons";

export default function SectorOverview() {
  useDocumentTitle("Sector Overview | Admin Console");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
        <HugeiconsIcon icon={ConstructionIcon} className="w-10 h-10 text-orange-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">Sector Overview</h1>
      <p className="text-gray-500 max-w-md">
        This section is pending the barangay migration decision. Check back later for the audited sector data dashboards.
      </p>
    </div>
  );
}
