import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  CheckmarkBadge01Icon,
  Alert02Icon,
  QrCodeIcon,
  Search01Icon,
  RefreshIcon,
  Camera01Icon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import apiClient from "../../../lib/apiClient";
import Spinner from "../Spinner";
import CertificateLifecycleBadge from "./CertificateLifecycleBadge";

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
      // Ensure element exists
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
          // Success callback
          verifyToken(decodedText);
        },
        () => {
          // Ignore parse errors while scanning
        }
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
      // Small timeout to allow DOM node render
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
                      onClick={() => handleTabChange("manual")}
                      className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold"
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
          )}

          {/* Tab 2: Manual Token Input */}
          {!isVerifying && !certData && !verifyError && activeTab === "manual" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (tokenInput.trim()) {
                  verifyToken(tokenInput);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="token-input" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Verification Token or URL
                </label>
                <div className="relative">
                  <input
                    id="token-input"
                    type="text"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 font-mono focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Paste the 36-character UUID token or the full QR verification URL.
                </p>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer"
              >
                <HugeiconsIcon icon={CheckmarkBadge01Icon} className="w-4 h-4" />
                <span>Verify Token</span>
              </button>
            </form>
          )}

          {/* Verification Result Card */}
          {!isVerifying && certData && (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                certData.status === "active"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : certData.status === "expiring_soon"
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : certData.status === "expired"
                  ? "bg-red-50/80 border-red-200 text-red-900"
                  : "bg-gray-100 border-gray-200 text-gray-800"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    certData.status === "active" ? "bg-emerald-500 text-white" :
                    certData.status === "expiring_soon" ? "bg-amber-500 text-white" :
                    certData.status === "expired" ? "bg-red-500 text-white" : "bg-gray-500 text-white"
                  }`}>
                    <HugeiconsIcon icon={certData.status === "active" ? CheckmarkBadge01Icon : Alert02Icon} className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold capitalize">
                      {certData.status === "active" ? "Valid & Active Credential" :
                       certData.status === "expiring_soon" ? "Expiring Soon" :
                       certData.status === "expired" ? "Expired Certificate" : "Revoked Certificate"}
                    </h3>
                    <p className="text-xs opacity-80">
                      Token: <span className="font-mono">{activeToken.slice(0, 8)}...{activeToken.slice(-4)}</span>
                    </p>
                  </div>
                </div>
                <CertificateLifecycleBadge status={certData.status} />
              </div>

              {/* Certificate Details */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium block">Learner Name</span>
                    <span className="text-gray-900 font-bold text-sm block mt-0.5">{certData.learner_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Module Completed</span>
                    <span className="text-gray-900 font-bold text-sm block mt-0.5">{certData.module_title}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Completion Date</span>
                    <span className="text-gray-700 font-semibold block mt-0.5">
                      {certData.completion_date ? new Date(certData.completion_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium block">Expiration Date</span>
                    <span className="text-gray-700 font-semibold block mt-0.5">
                      {certData.expires_at ? new Date(certData.expires_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition shadow-sm cursor-pointer text-xs"
                >
                  <HugeiconsIcon icon={RefreshIcon} className="w-4 h-4" />
                  <span>Verify Another</span>
                </button>
              </div>
            </div>
          )}

          {/* Verification Error State */}
          {!isVerifying && verifyError && (
            <div className="text-center py-6 px-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mx-auto">
                <HugeiconsIcon icon={Alert02Icon} className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  {verifyError === "NOT_FOUND" ? "Certificate Not Found" :
                   verifyError === "RATE_LIMIT" ? "Rate Limit Exceeded" : "Verification Failed"}
                </h3>
                <p className="text-xs text-red-600 mt-1 max-w-xs mx-auto leading-relaxed">
                  {verifyError === "NOT_FOUND"
                    ? "No valid certification matches this token. It may have been entered incorrectly or never issued."
                    : verifyError === "RATE_LIMIT"
                    ? "Too many requests. Please wait a moment before trying again."
                    : "Unable to complete verification at this time. Please check network connection."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanAnother}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 font-bold rounded-xl text-xs transition cursor-pointer shadow-sm"
              >
                <HugeiconsIcon icon={RefreshIcon} className="w-3.5 h-3.5" />
                <span>Try Another Token</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
