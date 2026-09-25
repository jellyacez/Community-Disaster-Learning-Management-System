import { Buffer } from "buffer/";
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
  globalThis.Buffer = globalThis.Buffer || Buffer;
}

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import App from "./App";
import "../src/styles/index.css";
import { ThemeProvider } from "./hooks/context/themeContext";
import * as syncManager from "./lib/LocalSave/syncManager";
import * as progressService from "./lib/LocalSave/progressService";
import { localDb } from "./lib/localDb";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error?.response?.status !== 401 && error?.response?.status !== 503) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "An unexpected error occurred.";
        toast.error(message);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

if (typeof window !== "undefined") {
  window.__offlineSync__ = {
    syncManager,
    progressService,
    localDb,
    queryClient,
    toast,
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);