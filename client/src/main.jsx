import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import toast from "react-hot-toast";
import App from "./App";
import "../src/styles/index.css";

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Global fallback error handler for all Queries.
      // We don't want to double-toast if the interceptor already handles it (e.g. 401, 503)
      if (error?.response?.status !== 401 && error?.response?.status !== 503) {
        toast.error(`Error: ${error.message}`);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 60s default cache time
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
