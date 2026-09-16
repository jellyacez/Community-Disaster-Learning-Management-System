import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  WifiOff01Icon,
  RefreshIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { useRegisterSW } from "virtual:pwa-register/react";

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("PWA service worker registered:", swUrl, registration);
    },
    onRegisterError(error) {
      console.error("PWA service worker registration error:", error);
    },
  });

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShowInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    console.log("PWA install choice:", choiceResult?.outcome);

    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
    setShowInstall(false);
  };

  if (!offlineReady && !needRefresh && !showInstall) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-full">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {needRefresh ? (
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <HugeiconsIcon icon={RefreshIcon} className="w-5 h-5" />
              </div>
            ) : showInstall ? (
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <HugeiconsIcon icon={Download01Icon} className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <HugeiconsIcon icon={WifiOff01Icon} className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex-1">
            {needRefresh ? (
              <>
                <h3 className="text-sm font-black text-gray-900">
                  Update Available
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  A newer version of Bacolor LMS is ready. Update now to get the
                  latest improvements.
                </p>
              </>
            ) : showInstall ? (
              <>
                <h3 className="text-sm font-black text-gray-900">
                  Install Bacolor LMS
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Install this app on your device for a faster, more app-like
                  experience and improved offline support.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-sm font-black text-gray-900">
                  App Ready Offline
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Bacolor LMS is now cached and can work better even with limited
                  connectivity.
                </p>
              </>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {needRefresh ? (
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Update
                </button>
              ) : showInstall ? (
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Install App
                </button>
              ) : null}

              <button
                onClick={closePrompt}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>

          <button
            onClick={closePrompt}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close install prompt"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}