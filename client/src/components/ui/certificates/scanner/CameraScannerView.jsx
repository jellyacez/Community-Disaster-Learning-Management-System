import { HugeiconsIcon } from "@hugeicons/react";
import { ViewOffIcon } from "@hugeicons/core-free-icons";
import Spinner from "../../Spinner";

export default function CameraScannerView({
  scannerStarted,
  cameraError,
  onSwitchToManual,
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-gray-200 shadow-inner flex items-center justify-center">
        <div id="qr-reader-viewport" className="w-full h-full" />
        {!scannerStarted && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900/80 p-4 text-center space-y-2">
            <Spinner className="w-6 h-6 text-white" />
            <p className="text-xs">Initializing camera feed...</p>
          </div>
        )}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900 p-4 text-center space-y-2">
            <HugeiconsIcon icon={ViewOffIcon} className="w-8 h-8 text-red-400" />
            <p className="text-xs text-red-300">{cameraError}</p>
            <button
              type="button"
              onClick={onSwitchToManual}
              className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold cursor-pointer"
            >
              Use Manual Input
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        Point camera directly at the certificate QR code
      </p>
    </div>
  );
}
