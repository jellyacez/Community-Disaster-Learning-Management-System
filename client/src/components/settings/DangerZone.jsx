import { HugeiconsIcon } from "@hugeicons/react";
import { Download01Icon, Delete01Icon } from "@hugeicons/core-free-icons";
import ConfirmationModal from "../ui/modals/ConfirmationModal";
import Spinner from "../ui/Spinner";
import { useDangerZone } from "./hooks/useDangerZone";

export default function DangerZone() {
  const { state, actions } = useDangerZone();
  const { isExporting, isDeactivating, showDeactivateModal } = state;

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/30 p-6 md:p-8 shadow-sm flex flex-col space-y-8">
      {/* Export Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Download01Icon} className="w-5 h-5 text-red-500" />
            Request Data Export
          </h4>
          <p className="text-sm text-gray-500 mt-1">Download a copy of your learning history, certificates, and personal data in JSON format.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex justify-end items-start">
          <button 
            onClick={actions.handleExport}
            disabled={isExporting}
            className="whitespace-nowrap rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <Spinner className="h-4 w-4 text-gray-500" />
                Exporting...
              </>
            ) : (
              "Export Data"
            )}
          </button>
        </div>
      </div>

      <hr className="border-red-200/50" />

      {/* Deactivate Row */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16">
        <div className="md:w-1/3 shrink-0">
          <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <HugeiconsIcon icon={Delete01Icon} className="w-5 h-5 text-red-500" />
            Deactivate Account
          </h4>
          <p className="text-sm text-gray-500 mt-1">Permanently disable your account and delete your data from the LMS system. This action cannot be undone.</p>
        </div>
        <div className="md:w-2/3 max-w-md flex justify-end items-start">
          <button 
            onClick={() => actions.setShowDeactivateModal(true)}
            disabled={isDeactivating}
            className="whitespace-nowrap rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeactivating ? (
              <>
                <Spinner className="h-4 w-4 text-white" />
                Deactivating...
              </>
            ) : (
              "Deactivate"
            )}
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeactivateModal}
        onClose={() => actions.setShowDeactivateModal(false)}
        onConfirm={actions.handleDeactivate}
        title="Deactivate Account"
        description="Are you sure you want to permanently deactivate your account? This will erase all your learning progress and cannot be undone."
        confirmText="Yes, Deactivate"
        type="danger"
        isLoading={isDeactivating}
      />
    </div>
  );
}
