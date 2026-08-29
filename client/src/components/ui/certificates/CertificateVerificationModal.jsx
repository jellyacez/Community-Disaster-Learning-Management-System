import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  QrCodeIcon,
  Search01Icon,
  Camera01Icon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../lib/apiClient";
import Spinner from "../Spinner";
import CameraScannerView from "./scanner/CameraScannerView";
import ManualTokenForm from "./scanner/ManualTokenForm";
import VerificationResultCard from "./scanner/VerificationResultCard";
import VerificationErrorState from "./scanner/VerificationErrorState";

export default function CertificateVerificationModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState("camera"); // 'camera' | 'manual'
  const [tokenInput, setTokenInput] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [certData, setCertData] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // Camera state
  const [scannerStarted, setScannerStarted] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);

  // Helper to extract UUID token from raw text or URL
  const extractToken = (rawText) => {
    if (!rawText) return "";
    const trimmed = rawText.trim();
    
    // Check if it's a URL
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const tokenParam = url.searchParams.get("token");
        if (tokenParam) return tokenParam.trim();
      }
    } catch (_) {
      // Not a valid URL, treat as direct string
    }

    // UUID regex match
    const uuidMatch = trimmed.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    return trimmed;
  };

  // Perform verification API call
  const verifyToken = async (token) => {
    const cleanToken = extractToken(token);
    if (!cleanToken) {
      setVerifyError("INVALID_TOKEN");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setCertData(null);
    setActiveToken(cleanToken);

    // If camera is running, stop it so result is clearly visible
    stopScanner();

    try {
      const response = await apiClient.get(`/certificates/verify/${cleanToken}`);
      if (response.data?.success && response.data?.data) {
        setCertData(response.data.data);
      } else {
        setVerifyError("NOT_FOUND");
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setVerifyError("NOT_FOUND");
      } else if (err.response?.status === 429) {
        setVerifyError("RATE_LIMIT");
      } else {
        setVerifyError("SERVER_ERROR");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // Start Camera Scanner
  const startScanner = async () => {
    if (scannerStarted || !isOpen || activeTab !== "camera" || certData || isVerifying) return;

    setCameraError(null);
    try {
      const qrElement = document.getElementById("qr-reader-viewport");
      if (!qrElement) return;

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader-viewport");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          verifyToken(decodedText);
        },
        () => {}
      );
      setScannerStarted(true);
    } catch (err) {
      console.warn("Failed to start camera scanner:", err);
      setCameraError(err.message || "Camera access permission denied or unavailable.");
      setScannerStarted(false);
    }
  };

  // Stop Camera Scanner
  const stopScanner = async () => {
    if (scannerRef.current && scannerStarted) {
      try {
        await scannerRef.current.stop();
      } catch (_) {
        // Ignored
      }
      setScannerStarted(false);
    }
  };

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    if (tab !== "camera") {
      stopScanner();
    }
    setActiveTab(tab);
  };

  // Reset to scan another certificate
  const handleScanAnother = () => {
    setCertData(null);
    setVerifyError(null);
    setActiveToken("");
    setTokenInput("");
    if (activeTab === "camera") {
      setTimeout(() => {
        startScanner();
      }, 100);
    }
  };

  // Lifecycle effects
  useEffect(() => {
    if (isOpen && activeTab === "camera" && !certData && !isVerifying) {
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, certData, isVerifying]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="verify-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-sm">
              <HugeiconsIcon icon={QrCodeIcon} className="w-5 h-5" />
            </div>
            <div>
              <h2 id="verify-modal-title" className="text-lg font-bold text-gray-900 leading-tight">
                Verify Certificate
              </h2>
              <p className="text-xs font-medium text-gray-500">
                Scan QR or lookup token to verify validity
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none cursor-pointer"
            aria-label="Close modal"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Mode Tabs (only visible when not displaying a finished result) */}
          {!certData && !verifyError && (
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTabChange("camera")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "camera"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <HugeiconsIcon icon={Camera01Icon} className="w-4 h-4" />
                <span>Camera Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("manual")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === "manual"
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <HugeiconsIcon icon={Search01Icon} className="w-4 h-4" />
                <span>Manual Token Lookup</span>
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {isVerifying && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Spinner className="w-8 h-8 text-red-600" />
              <p className="text-sm font-semibold text-gray-700">Verifying credential against registry...</p>
            </div>
          )}

          {/* Tab 1: Camera Scanner */}
          {!isVerifying && !certData && !verifyError && activeTab === "camera" && (
            <CameraScannerView
              scannerStarted={scannerStarted}
              cameraError={cameraError}
              onSwitchToManual={() => handleTabChange("manual")}
            />
          )}

          {/* Tab 2: Manual Token Input */}
          {!isVerifying && !certData && !verifyError && activeTab === "manual" && (
            <ManualTokenForm
              tokenInput={tokenInput}
              setTokenInput={setTokenInput}
              onSubmit={verifyToken}
            />
          )}

          {/* Verification Result Card */}
          {!isVerifying && certData && (
            <VerificationResultCard
              certData={certData}
              activeToken={activeToken}
              onVerifyAnother={handleScanAnother}
            />
          )}

          {/* Verification Error State */}
          {!isVerifying && verifyError && (
            <VerificationErrorState
              verifyError={verifyError}
              onTryAnother={handleScanAnother}
            />
          )}
        </div>
      </div>
    </div>
  );
}
